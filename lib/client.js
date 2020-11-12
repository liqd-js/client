'use strict';

const URL = require('url');
const Querystring = require('@liqd-js/querystring');
const ObjectMerge = require('@liqd-js/alg-object-merge');
const Response = require('./response');
const CookieJar = require('./cookiejar');

const ARR = arr => Array.isArray( arr ) ? arr : [ arr ];

function request( method, url, options = {})
{
    return new Promise(( resolve, reject ) =>
    {
        if( options.webroot )
        {
            url = URL.resolve(( options.webroot.replace(/\?.*/,'') + '/' ).replace(/\/\/+$/,'/'), url );
        }

        if( options.query )
        {
            url += ( url.includes('?') ? '&' : '?' ) + Querystring.stringify( options.query );
        }

        !options.headers && ( options.headers = {});
        !options.headers.hasOwnProperty( 'Accept-Encoding' ) && ( options.headers['Accept-Encoding'] = 'gzip, deflate, br' );

        if( options.cookiejar )
        {
            let cookies = options.cookiejar.get( url );

            cookies && ( options.headers['Cookie'] = cookies );
        }

        if( options.body && typeof options.body !== 'string' )
        {
            options.headers['Content-Type'] = 'application/json';

            options.body = JSON.stringify( options.body );
        }

        let req = require( url.startsWith('https') ? 'https' : 'http' ).request( url, { method, ...options }, res =>
        {
            if( options.cookiejar && res.headers['set-cookie'] ) // TODO Set-Cookie2
            {
                ARR( res.headers['set-cookie'] ).forEach( cookie_str => options.cookiejar.set( url, cookie_str ));
            }

            if([ 301, 302, 303, 307 ].includes( res.statusCode ))
            {
                request( method, URL.resolve( url, res.headers.location ), options ).then( resolve ).catch( reject );
            }
            else
            {
                resolve( Response( res ));
            }
        });

        req.on( 'error', reject );

        options.body && req.write( options.body );
        req.end();
    });
}

module.exports = class Client
{
    static get      ( url, options ){ return request( 'GET',    url, options )}
    static post     ( url, options ){ return request( 'POST',   url, options )}
    static put      ( url, options ){ return request( 'PUT',    url, options )}
    static patch    ( url, options ){ return request( 'PATCH',  url, options )}
    static delete   ( url, options ){ return request( 'DELETE', url, options )}

    #options;

    constructor( options = {})
    {
        this.#options = ObjectMerge({ cookiejar: new CookieJar() }, options );
    }

    get     ( url, options ){ return request( 'GET',    url, ObjectMerge({}, this.#options, options ))}
    post    ( url, options ){ return request( 'POST',   url, ObjectMerge({}, this.#options, options ))}
    put     ( url, options ){ return request( 'PUT',    url, ObjectMerge({}, this.#options, options ))}
    patch   ( url, options ){ return request( 'PATCH',  url, ObjectMerge({}, this.#options, options ))}
    delete  ( url, options ){ return request( 'DELETE', url, ObjectMerge({}, this.#options, options ))}

    get cookiejar()
    {
        return this.#options.cookiejar;
    }
}
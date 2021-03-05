'use strict';

const URL = require('url');
const Querystring = require('@liqd-js/querystring');
const ObjectMerge = require('@liqd-js/alg-object-merge');
const Response = require('./response');
const CookieJar = require('./cookiejar');

const ARR = arr => Array.isArray( arr ) ? arr : [ arr ];

function lowercase_headers( headers )
{
    return headers ? Object.keys( headers ).reduce(( hh, h ) => ( hh[h.toLowerCase()] = headers[h], hh ), {}) : {};
}

function request( method, url, options = {})
{
    return new Promise(( resolve, reject ) =>
    {
        const headers = lowercase_headers( options.headers );

        if( options.webroot )
        {
            url = URL.resolve(( options.webroot.replace(/\?.*/,'') + '/' ).replace(/\/\/+$/,'/'), url );
        }

        if( options.query )
        {
            url += ( url.includes('?') ? '&' : '?' ) + Querystring.stringify( options.query );
        }
        
        !headers.hasOwnProperty( 'accept-encoding' ) && ( headers['accept-encoding'] = 'gzip, deflate, br' );

        if( options.cookiejar )
        {
            let cookies = options.cookiejar.get( url );

            cookies && ( headers['cookie'] = cookies );
        }

        if( options.body )
        {
            if( options.body instanceof Buffer )
            {
                headers['content-length'] = options.body.length;
            }
            else
            {
                if( typeof options.body !== 'string' )
                {
                    if( headers['content-type'] === 'application/x-www-form-urlencoded' )
                    {
                        options.body = Querystring.stringify( options.body );
                    }
                    else
                    {
                        headers['content-type'] = 'application/json';
                        options.body = JSON.stringify( options.body );
                    }
                }

                headers['content-length'] = Buffer.byteLength( options.body, 'utf8' );
            }
        }
        else{ headers['content-length'] = 0; }

        let req = require( url.startsWith('https') ? 'https' : 'http' ).request( url, { method, headers }, res =>
        {
            if( options.cookiejar && res.headers['set-cookie'] ) // TODO Set-Cookie2
            {
                ARR( res.headers['set-cookie'] ).forEach( cookie_str => options.cookiejar.set( url, cookie_str ));
            }

            if([ 301, 302, 303, 307 ].includes( res.statusCode ))
            {
                if([ 302, 303 ].includes( res.statusCode ))
                {
                    method = 'GET';
                    delete options.body;
                    delete headers['content-type'];   
                }

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
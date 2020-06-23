'use strict';

const URL = require('url');
const Querystring = require('@liqd-js/querystring');
const ObjectMerge = require('@liqd-js/alg-object-merge');
const Response = require('./response');

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

        if( options.body && typeof options.body !== 'string' )
        {
            if( !options.headers ){ options.headers = {}}
            options.headers['Content-Type'] = 'application/json';

            options.body = JSON.stringify( options.body );
        }

        //console.log( options )

        let req = require( url.startsWith('https') ? 'https' : 'http' ).request( url, { method, ...options }, res =>
        {
            //console.log( Object.keys( res ));

            if([ 301, 302, 303, 307 ].includes( res.statusCode ))
            {
                request( method, res.headers.location, options ).then( resolve ).catch( reject );
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

const Client = module.exports = class Client
{
    static get      ( url, options ){ return request( 'GET',    url, options )}
    static post     ( url, options ){ return request( 'POST',   url, options )}
    static put      ( url, options ){ return request( 'PUT',    url, options )}
    static patch    ( url, options ){ return request( 'PATCH',  url, options )}
    static delete   ( url, options ){ return request( 'DELETE', url, options )}

    #options;

    constructor( options = {})
    {
        this.#options = options;
    }

    get     ( url, options ){ return request( 'GET',    url, ObjectMerge({}, this.#options, options ))}
    post    ( url, options ){ return request( 'POST',   url, ObjectMerge({}, this.#options, options ))}
    put     ( url, options ){ return request( 'PUT',    url, ObjectMerge({}, this.#options, options ))}
    patch   ( url, options ){ return request( 'PATCH',  url, ObjectMerge({}, this.#options, options ))}
    delete  ( url, options ){ return request( 'DELETE', url, ObjectMerge({}, this.#options, options ))}
}
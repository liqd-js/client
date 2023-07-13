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
        let { webroot, headers, cookiejar, query, body, ...req_options } = options;

        headers = lowercase_headers( headers );

        if( webroot )
        {
            url = URL.resolve(( webroot.replace(/\?.*/,'') + '/' ).replace(/\/\/+$/,'/'), url );
        }

        if( query )
        {
            url += ( url.includes('?') ? '&' : '?' ) + Querystring.stringify( query );
        }
        
        !headers.hasOwnProperty( 'accept-encoding' ) && ( headers['accept-encoding'] = 'gzip, deflate, br' );

        if( cookiejar )
        {
            let cookies = cookiejar.get( url );

            cookies && ( headers['cookie'] = cookies );
        }

        if( body )
        {
            if( body instanceof Buffer )
            {
                headers['content-length'] = body.length;
            }
            else
            {
                if( typeof body !== 'string' )
                {
                    if( headers['content-type'] === 'application/x-www-form-urlencoded' )
                    {
                        body = Querystring.stringify( body );
                    }
                    else if( headers['content-type'] === 'application/ejson' )
                    {
                        body = require('@liqd-js/ejson').stringify( body );
                    }
                    else
                    {
                        headers['content-type'] = 'application/json';
                        body = JSON.stringify( body );
                    }
                }

                headers['content-length'] = Buffer.byteLength( body, 'utf8' );
            }
        }
        else{ headers['content-length'] = 0; }

        let req = require( url.startsWith('https') ? 'https' : 'http' ).request( url, { method, headers, ...req_options }, res =>
        {
            if( cookiejar && res.headers['set-cookie'] ) // TODO Set-Cookie2
            {
                ARR( res.headers['set-cookie'] ).forEach( cookie_str => cookiejar.set( url, cookie_str ));
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

        // TODO assignProperty as symbol
        req.performance = { start: null, lookup: 0, connect: 0, tls: 0, head: 0, response: 0, total: 0 };

        req.on( 'socket', socket => 
        {
            req.performance.start = Date.now();
            
            socket.on( 'lookup', () => { req.performance.lookup = Date.now() - req.performance.start; req.performance.total += req.performance.lookup });
            socket.on( 'connect', () => { req.performance.connect = Date.now() - req.performance.start - req.performance.total; req.performance.total += req.performance.connect });
            socket.on( 'secureConnect', () => { req.performance.tls = Date.now() - req.performance.start - req.performance.total; req.performance.total += req.performance.tls });
        });

        req.on( 'error', reject );

        body && req.write( body );
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
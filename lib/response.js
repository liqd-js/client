'use strict';

const GETTERS = 
{
    buffer  : body => body,
    text    : body => body.toString('utf8'),
    json    : ( body, headers ) => 
    { 
        try
        {
            body = ( headers['content-type']?.startsWith( 'application/ejson' ) ? require('@liqd-js/ejson') : JSON ).parse( body = body.toString('utf8'));
        }
        catch(e){}
        
        return body
    }
}

module.exports = function Response( response )
{
    let body;

    function read_body()
    {
        return new Promise(( resolve, reject ) =>
        {
            let body = [], stream = response;

            // TODO if empty then do not fail - https://github.com/sindresorhus/decompress-response/blob/master/index.js

            switch( response.headers['content-encoding'] )
            {
                case 'gzip'     : stream = stream.pipe( require('zlib').createUnzip() ); break;
                case 'deflate'  : stream = stream.pipe( require('zlib').createInflateRaw() ); break;
                case 'br'       : stream = stream.pipe( require('zlib').createBrotliDecompress() ); break;
            }

            stream.on( 'data', data => body.push( data ));
            stream.on( 'end', () => resolve( Buffer.concat( body )));
            stream.on( 'error', e => reject( e ));

            response.once( 'data', () => { response.req.performance.response = response.req.performance.head = Date.now() - response.req.performance.start - response.req.performance.total; response.req.performance.total += response.req.performance.response });
            response.on( 'end', () => { response.req.performance.response = Date.now() - response.req.performance.start - response.req.performance.total + response.req.performance.head; response.req.performance.total += response.req.performance.response - response.req.performance.head });
        });
    }

    Object.defineProperty( response, 'ok',
    {
        configurable    : true,
        enumerable      : false,
        get : () => 200 <= response.statusCode && response.statusCode < 300
    });

    Object.defineProperty( response, 'performance', 
    {
        configurable    : false,
        enumerable      : false,
        get : () => response.req.performance
    });

    for( let property of [ 'buffer', 'text', 'json' ])
    {
        Object.defineProperty( response, property,
        {
            configurable    : true,
            enumerable      : false,
            get : () =>
            {
                return ( body || ( body = read_body() )).then( body => GETTERS[property]( body, response.headers ));
            },
            set : ( value ) =>
            {
                return response[property] = value; // TODO overit
            }
        });
    }
    
    return response;
}
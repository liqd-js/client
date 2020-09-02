'use strict';

const GETTERS = 
{
    buffer  : body => body,
    text    : body => body.toString('utf8'),
    json    : body => { try{ body = JSON.parse( body = body.toString('utf8'))}catch(e){} return body }
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
                case 'deflate'  : stream = stream.pipe( require('zlib').createUnzip() ); break;
                case 'br'       : stream = stream.pipe( require('zlib').createBrotliDecompress() ); break;
            }

            stream.on( 'data', data => body.push( data ));
            stream.on( 'end', () => resolve( Buffer.concat( body )));
            stream.on( 'error', e => reject( e ));
        });
    }

    Object.defineProperty( response, 'ok',
    {
        configurable    : true,
        enumerable      : false,
        get : () => 200 <= response.statusCode && response.statusCode < 300
    });

    for( let property of [ 'buffer', 'text', 'json' ])
    {
        Object.defineProperty( response, property,
        {
            configurable    : true,
            enumerable      : false,
            get : () =>
            {
                return ( body || ( body = read_body() )).then( GETTERS[property] );
            },
            set : ( value ) =>
            {
                return response[property] = value; // TODO overit
            }
        });
    }
    
    return response;
}
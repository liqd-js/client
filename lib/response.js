'use strict';

const GETTERS = 
{
    buffer : function( body, resolve, reject )
    {
        return resolve( body );
    },
    text : function( body, resolve, reject )
    {
        resolve( body.toString('utf8'));
    },
    json : function( body, resolve, reject )
    {
        try{ resolve( JSON.parse( body.toString('utf8'))) }catch(e){ reject(e) }
    }
}

module.exports = function Response( response )
{
    let body;

    function read_body()
    {
        body = [];

        response.on( 'data', data => body.push( data ));
        response.on( 'end', () => { body = Buffer.concat( body )});
        //response.on( 'error', reject );
    }

    for( let property of [ 'buffer', 'text', 'json' ])
    {
        Object.defineProperty( response, property,
        {
            configurable    : true,
            enumerable      : false,
            get : () =>
            {
                ( body === undefined ) && read_body();

                return new Promise(( resolve, reject ) =>
                {
                    if( body instanceof Buffer )
                    {
                        GETTERS[property]( body, resolve, reject );
                    }
                    else
                    {
                        response.on( 'end', () => GETTERS[property]( body, resolve, reject ));
                        response.on( 'error', reject );
                    }
                });
            },
            set : ( value ) =>
            {
                return response[property] = value; // TODO overit
            }
        });
    }
    
    return response;
}
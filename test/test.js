const Client = require('../lib/client');

async function test()
{
    let client = new Client();

    //let res = await new Client().get( 'https://www.google.com' );
    //let res = await client.get( 'https://www.google.com' );

    let res = await client.get( 'https://skate-bratislava.sk/' );
    //let res = await client.get( 'https://mall.sk/' );

    console.log( res.statusCode, res.ok, res.headers );

    //res.json.then( j => console.log( j.length ))
    //res.json.then( j => console.log( j.length ))
    //res.json.then( j => console.log( j.length ))

    //console.log(( await res.json ).length )
    //console.log(( await res.json ).length )
    //console.log( await res.json )

    res = await client.get( 'https://www.google.com' );

    console.log( res.statusCode, res.ok, res.headers );
}

test()
'use strict';

const D = decodeURIComponent, E = encodeURIComponent;

class DefaultMap extends Map
{
    get( key, default_value = true )
    {
        default_value && !this.has( key ) && this.set( key, new DefaultMap());
        
        return super.get( key );
    }
}

function root( domain )
{
    return domain.replace( /^.*?([^.]+\.(co\.uk|[^.]+))$/, '$1' ) // TODO tld protection ( co.uk, ... )
}

function overrides_cookie( cur, old )
{
    return !old || cur.score.domain > old.score.domain || ( cur.score.domain === old.score.domain && cur.score.path > old.score.path );
}

module.exports = class CookieJar
{
    #domains = new DefaultMap();

    set( url, cookie_str )
    {
        if( !url && Array.isArray( url ))
        {
            for( let cookie of url )
            {
                cookie.score = { domain: cookie.domain.replace(/[^.]/g,'').length, path: cookie.path.replace(/[^/]/g,'').length };

                this.#domains.get( root( cookie.domain )).get( cookie.domain ).get( cookie.path ).set( cookie.name, cookie );
            }

            return;
        }

        url = new URL( url );

        const cookie = cookie_str.split( /\s*;\s*/ ).map( p => p.match( /^(?<key>[^=]+)=?(?<value>.*)$/ ).groups ).reduce(( c, p, i ) => 
        ( i === 0 
            ? ( c.name = D( p.key )) && ( c.value = D( p.value )) 
            : ( c[D( p.key ).toLowerCase()] = D( p.value ) || true )
        , c ),
        {});

        if( !cookie.expires && cookie['max-age'] )
        {
            cookie.expires = new Date( Math.ceil( Date.now() + 1000 * parseInt( cookie['max-age'] ))).toUTCString();
            delete cookie['max-age'];
        }

        ( !cookie.domain || cookie.domain === true ) && ( cookie.domain = url.hostname );
        ( !cookie.path || cookie.path === true ) && ( cookie.path = url.pathname || '/' );
        
        !cookie.domain.startsWith('.') && ( cookie.domain = '.' + cookie.domain );
        !cookie.path.endsWith('/') && ( cookie.path = cookie.path + '/' );

        cookie.score = { domain: cookie.domain.replace(/[^.]/g,'').length, path: cookie.path.replace(/[^/]/g,'').length };

        if( !cookie.value || cookie.value === 'deleted' || new Date( cookie.expires ).getTime() < Date.now() )
        {
            this.#domains.get( root( cookie.domain )).get( cookie.domain ).get( cookie.path ).delete( cookie.name );
        }
        else
        {
            this.#domains.get( root( cookie.domain )).get( cookie.domain ).get( cookie.path ).set( cookie.name, cookie );
        }

        this.get( url.toString() )
    }

    cookies()
    {
        let cookies = [];

        for( let root of this.#domains.values() )
        {
            for( let domain of root.values() )
            {
                for( let path of domain.values() )
                {
                    for( let cookie of path.values() )
                    {
                        let { score, ...data } = cookie;

                        cookies.push( data );
                    }
                }
            }
        }

        return cookies;
    }

    get( url )
    {
        if( !url ){ return this.cookies() }

        url = new URL( url );
        
        let jar = new Map(), domain = '.' + url.hostname, path = url.pathname.replace(/\/+^/,'') + '/', cookies = this.#domains.get( root( domain )), jar_cookie;

        if( cookies )
        {
            for( let [ subdomain, paths ] of cookies.entries() )
            {
                if( domain.endsWith( subdomain ))
                {
                    for( let [ cookie_path, path_cookies ] of paths.entries() )
                    {
                        if( path.startsWith( cookie_path ))
                        {
                            for( let cookie of path_cookies.values() )
                            {
                                if( !cookie.secure || url.protocol === 'https:' )
                                {
                                    jar.set( cookie.name, overrides_cookie( cookie, jar_cookie = jar.get( cookie.name )) ? cookie.value : jar_cookie.value );
                                }
                            }
                        }
                    }
                }
            }
        }

        return [...jar.entries()].map( c => E(c[0]) + '=' + E(c[1]) ).join('; ');
    }
}
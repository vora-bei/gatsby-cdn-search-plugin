import {
    Db,
    log,
    NgramIndice,
    RangeLinearIndice,
    restoreSharedIndicesBrowser,
    Schema,
    SimpleIndice,
    TextLexIndice,
} from "cdn-static-database";
import {useEffect, useMemo, useState} from "react";
import {ISharedIndice} from "cdn-static-database/types/@types/indice";

export {log} from "cdn-static-database";
const baseUrl = '/cdn-indice/';
export const restore = async (id: string, dbId: string) => {
    return restoreSharedIndicesBrowser<any, any>({
        id,
        baseUrl: `/cdn-indice/${dbId}`,
        deserializeShared: RangeLinearIndice.lazy,
        deserialize: NgramIndice.deserialize
    })
}

export enum Engine {
    "n-gram" = "n-gram",
    "simple" = "simple",
    "text-lex" = "text-lex"
}

export interface ISerializedIndice extends Record<string, unknown> {
    id: string,
    columns?: string[],
    column?: string,
    type?: Engine
};

export const getIndice = (indice: Partial<ISerializedIndice>) => {
    const {type = "simple", column, columns, ...options} = indice;
    if (type === "n-gram") {
        return new NgramIndice(options);
    }
    if (type === "text-lex") {
        return new TextLexIndice(options);
    }
    if (type === "simple") {
        return new SimpleIndice(options);
    }
    throw new Error(`Engine ${type} not found`)
}
export const getLazyIndice = (indice: Partial<ISerializedIndice>) => {
    const {type = "simple"} = indice;
    if (type === "n-gram") {
        return NgramIndice.deserialize;
    }
    if (type === "simple") {
        return SimpleIndice.deserialize;
    }
    if (type === "text-lex") {
        return TextLexIndice.deserialize;
    }
    throw new Error(`Engine ${type} not found`)
}

const getIndicePath = (indice: ISerializedIndice) => {
    const {type = "simple", column} = indice;
    if (column && type === "simple") {
        return column;
    } else {
        return `\$${indice.id}`;
    }
}
export const restoreDb = async (id: string) => {
    const response = await fetch(`${baseUrl}${id}/indices.${id}.json`, {
        method: 'GET',
        credentials: 'include',
        mode: 'no-cors',
    });
    const res: { indices: ISerializedIndice[], idAttr: string } = await response.json();
    const indiceInstances = await Promise.all([
        restoreSharedIndicesBrowser<any, any>({
            id: `data.${id}`,
            baseUrl: `/cdn-indice/${id}`,
            deserializeShared: RangeLinearIndice.lazy,
            deserialize: SimpleIndice.deserialize
        }),
        ...res.indices.map((indice) => restoreSharedIndicesBrowser<any, any>({
            id: indice.id,
            baseUrl: `/cdn-indice/${id}`,
            deserializeShared: RangeLinearIndice.lazy,
            deserialize: getLazyIndice(indice)
        }))
    ]);
    const primary: ISharedIndice<any, any> = indiceInstances.shift()!
    const indiceInstancesMap = new Map(indiceInstances.map((indice) => ([indice.id, indice])));
    return new Db(
        new Schema(
            res.idAttr,
            primary,
            res.indices
                .map(
                    indice =>
                        ({indice: indiceInstancesMap.get(indice.id)!, path: getIndicePath(indice)})
                )
        ));
}

export const useFullTextCursorStatelessQuery = <T extends never>(dbId: string, text: string, skip = 0, limit = 30): {
    next: () => Promise<T[]>;
    hasNext: () => Promise<boolean>;
    finish: () => Promise<void>;
} => {
    const $db = useMemo(() => (async () => await restoreDb(dbId))(), [dbId]);
    const cursorCreator = ($cursor) => ({
        next: async () => {
            const c = await $cursor;
            return await c.next();
        },
        hasNext: async () => {
            const c = await $cursor;
            return await c.hasNext();
        },
        finish: async () => {
            const c = await $cursor;
            c.finish();
        }
    })
    const cursor = useMemo(() => cursorCreator((async () => {
        const db: Db = await $db;
        return db.cursorText(text, skip, limit);
    })()), [text, skip, limit, dbId]);

    useEffect(() => {
        return () => {
            (async () => {
                if (cursor) {
                    try {
                        await cursor.finish();
                    } catch (e) {
                        console.error(e);
                    }
                }
            })()
        }
    }, [text, skip, limit, dbId]);

    return cursor;
}
export const useFullTextCursorStateFullQuery = <T extends never>(dbId: string, text: string, skip = 0, limit = 30): {
    next: () => Promise<void>;
    finish: () => Promise<void>;
    hasNext: boolean;
    page: T[];
    all: T[];
    fetching: boolean;
} => {
    const $db = useMemo(() => (async () => await restoreDb(dbId))(), [dbId]);
    const [state, setState] = useState({page: [], all: [], fetching: false, hasNext: false});
    const cursorCreator = ($cursor) => {
        let p: T[] = [];
        const a: T[] = [];
        return ({
            next: async () => {
                setState({...state, fetching: true, hasNext: false})
                const c = await $cursor;
                try {
                    p = await c.next();
                    a.push(...p);
                } catch (e){

                }
                const h = await c.hasNext()
                setState({page: p, all: a, fetching: false, hasNext: h})
            },
            finish: async () => {
                const c = await $cursor;
                c.finish();
            }
        });
    }
    const cursor = useMemo(() => cursorCreator((async () => {
        const db: Db = await $db;
        return db.cursorText(text, skip, limit);
    })()), [text, skip, limit, dbId]);

    useEffect(() => {
        cursor.next().catch((e) => {
            log.error(e);
        });
        return () => {
            (async () => {
                if (cursor) {
                    try {
                        await cursor.finish();
                    } catch (e) {
                        log.error(e);
                    }
                }
            })()
        }
    }, [text, skip, limit, dbId]);

    return {...cursor, ...state};
}




export const useCdnCursorQuery = <T extends never>(dbId: string, query: { [name: string]: never }, sort: { [name: string]: never }, skip = 0, limit = 30): {
    next: () => Promise<T[]>;
    hasNext: () => Promise<boolean>;
    finish: () => Promise<void>;
} => {
    const $db = useMemo(() => (async () => await restoreDb(dbId))(), [dbId]);
    const cursorCreator = ($cursor) => ({
        next: async () => {
            const c = await $cursor;
            return await c.next();
        },
        hasNext: async () => {
            const c = await $cursor;
            return await c.hasNext();
        },
        finish: async () => {
            const c = await $cursor;
            c.finish();
        }
    })
    const cursor = useMemo(() => cursorCreator((async () => {
        const db: Db = await $db;
        return db.cursor(query, sort, skip, limit);
    })()), [query, sort, skip, limit, dbId]);

    useEffect(() => {
        return () => {
            (async () => {
                if (cursor) {
                    try {
                        await cursor.finish();
                    } catch (e) {
                        console.error(e);
                    }
                }
            })()
        }
    }, [query, sort, skip, limit, dbId]);

    return cursor;
}
export const useCdnCursorStatelessQuery = useCdnCursorQuery;
export const useCdnCursorStatefulQuery = <T extends never>(dbId: string, query: { [name: string]: never }, sort: { [name: string]: never }, skip = 0, limit = 30): {
    next: () => Promise<void>;
    finish: () => Promise<void>;
    hasNext: boolean;
    page: T[];
    all: T[];
    fetching: boolean;
} => {
    const $db = useMemo(() => (async () => await restoreDb(dbId))(), [dbId]);
    const [state, setState] = useState({page: [], all: [], fetching: false, hasNext: false});
    const cursorCreator = ($cursor) => {
        let p: T[] = [];
        const a: T[] = [];
        return ({
            next: async () => {
                setState({...state, fetching: true, hasNext: false})
                const c = await $cursor;
                try {
                    p = await c.next();
                    a.push(...p);
                } catch (e){
                    log.trace(e);
                }
                const h = await c.hasNext()
                setState({page: p, all: a, fetching: false, hasNext: h})
            },
            finish: async () => {
                const c = await $cursor;
                c.finish();
            }
        });
    }
    const cursor = useMemo(() => cursorCreator((async () => {
        const db: Db = await $db;
        return db.cursor(query, sort, skip, limit);
    })()), [query, sort, skip, limit, dbId]);

    useEffect(() => {
        cursor.next().catch((e) => {
            log.error(e);
        });
        return () => {
            (async () => {
                if (cursor) {
                    try {
                        await cursor.finish();
                    } catch (e) {
                        log.error(e);
                    }
                }
            })()
        }
    }, [query, sort, skip, limit, dbId]);

    return {...cursor, ...state};
}
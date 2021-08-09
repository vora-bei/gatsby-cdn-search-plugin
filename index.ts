import { RangeLinearIndice } from "cdn-static-database/dist/range.linear.indice";
import { restoreSharedIndices } from "cdn-static-database/dist/utils.browser";
import { SimpleIndice } from "cdn-static-database/dist/simple.indice";
import { NgramIndice } from "cdn-static-database/dist/ngram.indice";
import { TextLexIndice } from "cdn-static-database/dist/text.lex.indice";
import { useEffect, useMemo } from "react";


import { Db } from "cdn-static-database/dist/db";
import { Schema } from "cdn-static-database/dist/schema";

const baseUrl = '/cdn-indice/';

export const restore = async (id: string, dbId: string) => {
    return restoreSharedIndices<any, any>({
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
export interface ISerializedIndice extends Record<string, unknown> { id: string, columns?: string[], column?: string, type?: Engine };

export const getIndice = (indice: Partial<ISerializedIndice>) => {
    const { type = "simple", column, columns, ...options } = indice;
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
    const { type = "simple" } = indice;
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
    const { type = "simple", column } = indice;
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
        restoreSharedIndices<any, any>({
            id: `data.${id}`,
            baseUrl: `/cdn-indice/${id}`,
            deserializeShared: RangeLinearIndice.lazy,
            deserialize: SimpleIndice.deserialize
        }),
        ...res.indices.map((indice) => restoreSharedIndices<any, any>({
            id: indice.id,
            baseUrl: `/cdn-indice/${id}`,
            deserializeShared: RangeLinearIndice.lazy,
            deserialize: getLazyIndice(indice)
        }))
    ]);
    const primary = indiceInstances.shift()
    const indiceInstancesMap = new Map(indiceInstances.map((indice) => ([indice.id, indice])));
    return new Db(
        new Schema(
            res.idAttr,
            primary,
            res.indices
                .map(
                    indice =>
                        ({ indice: indiceInstancesMap.get(indice.id)!, path: getIndicePath(indice) })
                )
        ));
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
      const db = await $db;
      return  db.cursor(query, sort, skip, limit);
    })()), [query, sort, skip, limit, dbId]);
  
    useEffect(() => {
      return () => {
        (async ()=>{
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
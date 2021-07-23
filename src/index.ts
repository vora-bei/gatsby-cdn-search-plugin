import { SimpleIndice, NgramIndice, RangeLinearIndice } from "cdn-static-database";
import { restoreSharedIndices } from "cdn-static-database/dist/utils.browser";
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
    "simple" = "simple"
}
export interface ISerializedIndice extends Record<string, unknown>
 { id: string, columns?: string[], column?: string, type?: Engine };

export const getIndice = (indice: Partial<ISerializedIndice>) => {
    const { type = "simple",column, columns, ...options } = indice;
    if (type === "n-gram") {
        return new NgramIndice(options);
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
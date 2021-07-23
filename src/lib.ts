import { RangeLinearIndice, SimpleIndice, saveSharedIndices } from 'cdn-static-database';
import path from 'path'
import fs from "fs";
import { join } from "path";
import util from "util";
import { Engine, getIndice, ISerializedIndice } from ".";
const mkdir = util.promisify(fs.mkdir);
const rmdir = util.promisify(fs.rmdir);
const exists = util.promisify(fs.exists);
const writeFile = util.promisify(fs.writeFile);
export interface ISerializedNode {
    [key: string]: never;
}
export interface IOptions {
    id: string;
    siteUrl: string;
    graphQL: string;
    engine: { type: Engine };
    chunkSize: number;
    dataChunkSize: number;
    normalizer: (results: any) => ISerializedNode[];
    idAttr: string;
    dataAttrs: string[];
    indices: ISerializedIndice[];
}

const packageName = 'gatsby-cdn-search-plugin';

export const buildIndex = async (graphql: any, options: IOptions) => {
    const { graphQL, normalizer, idAttr, indices, chunkSize,dataChunkSize = 25, id } = options;
    // @todo check args // some libs
    const results = await graphql(graphQL);
    if (results.errors) {
        console.error(results.errors);
        throw new Error(`${packageName} had a problem getting results from GraphQL.`);
    }
    if (normalizer) {
        const nodes: ISerializedNode[] = normalizer(results);
        const simpleEngine = new SimpleIndice({ id: `data.${id}` })
        // console.debug(nodes);
        const instanceIndices = indices.map(({id, column, columns, ...options})=>{
            return {indice: getIndice(options), columns: columns? columns: [column!], id};
        });
        nodes.forEach(node => {
            const id = node[idAttr];
            if (id === undefined) {
                throw new Error(`${packageName} had a problem normalizer results. idAttr is required`);
            }
            instanceIndices.forEach(({indice, columns})=>{
                indice.add(id, columns.map(key => node[key]));
            });
            simpleEngine.add(node, id);
        });
        const publicPath = join(path.resolve("./public"), 'cdn-indice');

        const indiceDir = join(publicPath, id);
        if (await exists(indiceDir)) {
            await rmdir(indiceDir, { recursive: true });
        }
        await mkdir(indiceDir, { recursive: true });
        await Promise.all(instanceIndices.map(async ({indice, id})=>{
            const rangeIndice = new RangeLinearIndice({ indice, chunkSize, id });
            await saveSharedIndices(rangeIndice, indiceDir);
        }));
        const dataIndice = new RangeLinearIndice({ indice: simpleEngine, chunkSize: dataChunkSize, id: `data.${id}` });
        await writeFile(join(indiceDir,`indices.${id}.json`), JSON.stringify({indices, idAttr}));
        await saveSharedIndices(dataIndice, indiceDir);
    }


}

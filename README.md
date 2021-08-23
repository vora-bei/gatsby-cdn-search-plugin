# Gatsby cdn search plugin
Mongo query compatible search plugin for gatsby. 
Create indices assets in the build directory.
Restore and load indices on-demand from CDN.
Useful for big indices.
I used my own search engine for search.
The plugin supports n-gram, mongo-like operators, regexp starts with "^abcd". 
Search parsed search expression and finds suit indices.
The next step is to load the table of contents indices.
The third step is to load chunks of indices and intersect results.
The last step test result by Mingo library.
### Plugins config
```javascript
    plugins = [
    'gatsby-plugin-offline',
    {
      resolve: require.resolve("./cdn-indice-plugin"),
      options: {
        id: 'cars', // Id database collection
        chunkSize: 6000, // Indices chunk size. This affects the number of indices files. 
        dataChunkSize: 60, // Data chunk size. This affects the number of data files.
        indices: [ // Secondary indices. Add column available to search. 
          {
              id: 'model',
              column: 'model',
              type: 'simple', // Default value simple indices by one column only.
                              // You can search by this column with regular Mongo predicate
                              // lt, gt, eq, ... etc. Also support regexp by "start with regexp"
          },
          { id: 'make', column: 'make' },
          { id: 'year', column: 'year' },
          { id: 'state', column: 'state' },
          { 
              id: 'id-state',
              column: 'state',
              algoritm: 'english', // 'russian','italian' e.t.c   words -> word 
              type: 'text-lex' // Indices using "The Porter Stemming" Algorithm.
                               // You can search by this column with specific not Mongo predicate.
                               //  {$id-state:  "search"}
          },
          { 
              id: 'ngram',
              type: "n-gram",// Indices using the N-Gram algorithm for search with typos.
                            // Alse support "The Porter Stemming Algorithm" for zipping indices.
                            // You can search by this column with specific not Mongo predicate.
                        //  {$ngram:  "search"}
              actuationLimit: 1, // minimum match n-gram 
              actuationLimitAuto: false, //  If option equal true.
                                          // Minimum match n-gram calculate auto by size of search word.
              gramLen: 3, // n-gram = 3 [color] -> [col, olo, lor]
              toLowcase: true, // case sensitive
              algoritm: 'english', // Default null. "The Porter Stemming Algorithm"
              stopWords: ["and"], // The words exclude for search
              columns: ['model', 'make', 'color'] // indexing columns 
          }
        ],
        idAttr: 'id', // Primary id.  
        normalizer: ({ data }) => { // transform result of graphql query to data
          return data.recentCars
            .map(( {id, ...node} ) => ({ id: id.replace('Car__',''), ...node }));
        },
          // graphql query for featching data
        graphQL: `query MyQuery { 
          recentCars(cursor: 0, limit: 500000){
              id
              color
              make
              mmr
              model
              seller
              sellingprice
              state
              transmission
              trim
              vin
              year
        }
      }`
      }
    }
    ]
```
### Usage React hook
```javascript
import { useCdnCursorQuery, log } from 'gatsby-cdn-search-plugin'
log.enableAll(); // full logging 
const makeQuery = (search) => { // Different query strategy. It is depends of length search word
  if (search.length >= 4) {
    return { $ngram: search, year: { $lte: 2014 } }; // n-gram and  year <= 2014
  } else if (!!search.length) {
    return {
      $or: [
        { model: { $regex: new RegExp(`^${search}`, 'i'), }, }, // regexp by two columns
        { make: { $regex: new RegExp(`^${search}`, 'i'), }, }
      ],
    };
  } else {
    return { year: { $lte: 2014 } }; // only date predicate
  }
}
const [state, dispatch] = useReducer(reducer, initialState);

const query = useMemo(() => makeQuery(state.search), [state.search]);

const cursor = useCdnCursorQuery('cars', query, undefined, 0, 30); // hook return cursor of data

  useEffect(() => {
    (async () => {
        let list = await cursor.next(); // load first slice of data
        dispatch({ type: 'load', list });
    })();
  }, [state.search, cursor])

  useEffect(() => {
    (async () => {
      if (await cursor.hasNext()) {
        let list = await cursor.next(); // load next slice of data 
        dispatch({ type: 'loadMore', list })
      }
    })()
  }, [state.page]);

```


### Usage find api

```javascript

      import { restoreDb } from 'gatsby-cdn-search-plugin'

      const db = await restoreDb('cars');
      let result;
      if (search.length >= 4) {
        result = await db.find({ $ngram: search, year: { $gte: 2014 } }, undefined, 0, offset);
      } else if (!!search.length) {
        result = await db.find({ model: { $regex: new RegExp(`^${search}`, 'i'), }, year: { $gte: 2014 } }, undefined, 0, offset);
      } else {
        result = await db.find({ year: { $gte: 2014 } }, undefined, 0, offset);
      }
```

### Usage cursor api

```javascript

      import { restoreDb } from 'gatsby-cdn-search-plugin'

      let cursor;
      const searchFetch = async (search, skip = 0, limit = 30) => {
        const db = await restoreDb('cars');
        if(cursor){
          cursor.finish();
        }
        if (search.length >= 4) {
          cursor =  db.cursor({ $ngram: search, year: { $gte: 2014 } }, undefined, skip, limit);
        } else if (!!search.length) {
          cursor =  db.cursor({
            $or: [
              { model: { $regex: new RegExp(`^${search}`, 'i'), }, },
              { make: { $regex: new RegExp(`^${search}`, 'i'), }, }
            ],
          }, undefined, skip, limit);
        } else {
          cursor = db.cursor({ year: { $gte: 2014 } }, undefined, skip, limit);
        }
        return await cursor.next();
      }
```

### Live demo 
    
Kaggle dataset "Used Car Auction Prices" 500 000 row 

[live demo](https://gatsby-5o5.pages.dev/cars/)


[source code on github](https://github.com/vora-bei/gatsby-cdn-search-demo-site)
  
    
[source of data](https://www.kaggle.com/tunguz/used-car-auction-prices)


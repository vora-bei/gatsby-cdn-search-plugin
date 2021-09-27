# Gatsby cdn search plugin
> This plugin is in _beta_ and still in work
> 
> Give us any feedback, open issues for any questions or ideas

Mongo query compatible search plugin for gatsby.

It is a no cost way to add search to your site.

Key technology is http2 protocol, CDN, mongo-like query and N-GRAM search.

The plugin supports mongo-like query syntax with custom n-gram search.

Idea of this plugin is simple.
- calculated indices in build phase of gatsby apps. (n-gram, text-lex, simple)
- split the indices by chunk
- create range diapason indices as "table of contents" the chunk
- save all chunk and "table of contents" on CDN as assets
- in runtime plugin restore indices and  efficiently on-demand loaded chunk over http2 protocol
- http2 multiplexing multiple requests over a single TCP connection.

The plugin has native support React via Hook "useCdnCursorQuery".

Also, you can trace your request with log-level.
```javascript
import { useCdnCursorQuery, log } from 'gatsby-cdn-search-plugin'
log.enableAll(); // full logging 
```

### Live demo

Kaggle dataset "Used Car Auction Prices" 500 000 row

[live demo](https://gatsby-5o5.pages.dev/cars/)


[source code on github](https://github.com/vora-bei/gatsby-cdn-search-demo-site)


[source of data](https://www.kaggle.com/tunguz/used-car-auction-prices)

### Plugins config
```javascript
    plugins = [
    'gatsby-plugin-offline',
    {
      resolve: require.resolve("./cdn-indice-plugin"),
      options: {
        id: 'cars',
        chunkSize: 6000,
        dataChunkSize: 60,
        indices: [  
          {
              id: 'model',
              column: 'model',
              type: 'simple', 
          },
          { id: 'make', column: 'make' },
          { id: 'year', column: 'year' },
          { id: 'state', column: 'state' },
          { 
              id: 'id-state',
              column: 'state',
              algoritm: 'english',
              type: 'text-lex' 
          },
          { 
              id: 'ngram',
              type: "n-gram",
              actuationLimit: 1,
              actuationLimitAuto: false, 
              gramLen: 3, 
              toLowcase: true, 
              algoritm: 'english',
              stopWords: ["and"],
              columns: ['model', 'make', 'color'] 
          }
        ],
        idAttr: 'id',
        normalizer: ({ data }) => { 
          return data.recentCars
            .map(( {id, ...node} ) => ({ id: id.replace('Car__',''), ...node }));
        },
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
### Plugin options
| Options name  | Type                                                                      | Required | Default value | Description                                                                                                                        |
|---------------|---------------------------------------------------------------------------|----------|---------------|------------------------------------------------------------------------------------------------------------------------------------|
| id            | String                                                                    | True     | None          | Unique id database collection. The first parameter in React Hook useCdnCursorQuery.                                                |
| chunkSize     | Number                                                                    | False    | 500           | Indices chunk size. This affects the number of indices files. You should select this parameters depends of size of your collection |
| dataChunkSize | Number                                                                    | False    | 25            | Data chunk size. This affects the number of data files.                                                                            |
| idAttr        | String                                                                    | True     | None          | Primary id attribute name.                                                                                                         |
| normalizer    | Function({data: any}): Row[]                                              | True     | None          | It is callback for handle data from graphQl                                                                                        |
| graphQL       | graphQL string                                                            | True     | None          | Graphql query for fetching data                                                                                                    |
| indices       | Array<Union<NgramIndicesOption ,TextLexIndicesOption ,SimpleIndicesOption>> | True     | None          | Secondary indices. Add column available to search.                                                                                 |

### NgramIndicesOption
| Options name       | Type     | Required | Default value | Description                                                                                                                                                                                                          |
|--------------------|----------|----------|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| type               | "n-gram" | True     | simple        | Indices using the N-Gram algorithm for search with typos.  Also, support "The Porter Stemming Algorithm" for zipping indices.  You can search by this column with specific not Mongo predicate.  {$ngram:  "search"} |
| id                 | String   | True     | None          | Unique id of indices. Uses as operator name in the search. Query example for id "ngram" is {$ngram:  "search"}                                                                                                       |
| actuationLimit     | Number   | True     | None          | Minimum match n-gram in search.  [color] -> [col, olo, lor]                                                                                                                                                          |
| actuationLimitAuto | Boolean  | False    | False         | If option equal true option actuationLimit doesn't work.  Actuation limit n-gram calculates auto by the size of the search word.                                                                                     |
| gramLen: 3         | Number   | False    | 3             | Size of. Example if n-gram equal 3 "color" was split to "col", "olo", "lor"                                                                                                                                          |
| toLowcase          | Boolean  | False    | False         | Case sensitive search                                                                                                                                                                                                |
| stem               | String   | False    | None          |  Preprocess indices with "The Porter Stemming Algorithm".  Available values 'english', 'russian', ...                                                                                                                |
| columns            | String[] | True     | None          | Indexing columns                                                                                                                                                                                                     |
| stopWords          | String[] | False    | None          | The words exclude for search                                                                                                                                                                                         |

### SimpleIndicesOption
| Options name | Type       | Required | Default value | Description                                                                                                           |
|--------------|------------|----------|---------------|-----------------------------------------------------------------------------------------------------------------------|
| type         | "text-lex" | True     | simple        | The Porter Stemming Algorithm.    You can search by this column with specific not Mongo predicate.  {$lex:  "search"} |
| id           | String     | True     | None          | Unique id of indices. Uses as operator name in the search. Query example for id "ngram" is {$lex:  "search"}          |
| algoritm     | String     | False    | None          |  Preprocess indices with "The Porter Stemming Algorithm".  Available values 'english', 'russian', ...                 |
| column       | String     | True     | None          | Indexing column                                                                                                       |

### TextLexIndicesOption
| Options name | Type     | Required | Default value | Description                                                                                                                                                                    |
|--------------|----------|----------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| type         | "simple" | True     | "simple"      | Default value simple indices by one column only. You can search by this column with regular Mongo predicate  lt, gt, eq, ... etc. Also, support regexp by "start with regexp"  |
| id           | String   | True     | None          | Unique id of indices. Uses as operator name in the search. Query example for id "ngram" is {$lex:  "search"}                                                                   |
| column       | String   | True     | None          | Indexing column                                                                                                                                                                |

### Usage stateful React hook
```javascript
import { useCdnCursorStatelessQuery, log } from 'gatsby-cdn-search-plugin'
log.enableAll(); // full logging 


const makeQuery = (search) => { // Different query strategy. It is depends of length search word
  if (search.length >= 4) {
    return { $ngram: search }; // n-gram 
  } else if (!!search.length) {
    return {
      $or: [
        { model: { $regex: new RegExp(`^${search}`, 'i'), }, }, // regexp by two columns
        { make: { $regex: new RegExp(`^${search}`, 'i'), }, }
      ],
    };
  } else {
    return undefined;
  }
}
const [state, dispatch] = useReducer(reducer, initialState);

const query = useMemo(() => makeQuery(state.search), [state.search]);

const {hasNext, next, fetching, all, page} = useCdnCursorStatefulQuery('cars', query, {year: 1}, 0, 30); // hook return cursor of data

const load = useMemo(() => {
    if (hasNext && !fetching) {
          next(); // load next slice of data 
    }}, [hasNext, fetching, next]);

```


### Usage stateless React hook (more complicated)
```javascript
import { useCdnCursorStatelessQuery, log } from 'gatsby-cdn-search-plugin'
log.enableAll(); // full logging 

const initialState = {
    loading: false,
    search: '',
    list: [],
    page: 0,
};

function reducer(state, action) {
    switch (action.type) {
        case 'pageUp':
            return { ...state, page: state.page + 1 }
        case 'type':
            return { ...state, search: action.value }
        case 'loading':
            return { ...state, loading: true }
        case 'load':
            return { ...state, loading: false, list: action.list, page: 0 };
        case 'indice':
            return { ...state, indice: action.value }
        case 'loadMore':
            return { ...state, loading: false, list: [...state.list, ...action.list] };
        default:
            throw new Error();
    }
}

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

const cursor = useCdnCursorQuery('cars', query, {year: 1}, 0, 30); // hook return cursor of data

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




### Usage find api exactly

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

### Usage cursor api exactly

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



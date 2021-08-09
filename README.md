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
    'gatsby-plugin-offline'
    {
      resolve: require.resolve("./cdn-indice-plugin"),
      options: {
        id: 'cars',
        chunkSize: 6000,
        dataChunkSize: 60,
        indices: [
          { id: 'model', column: 'model' },
          { id: 'make', column: 'make' },
          { id: 'year', column: 'year' },
          { id: 'state', column: 'state' },
          { id: 'ngram', type: "n-gram", actuationLimit: 1, actuationLimitAuto: false, gramLen: 4, toLowcase: true, 
          columns: ['model', 'make', 'color'] }
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

### Usage React hook 
```javascript
import { useCdnCursorQuery } from 'gatsby-cdn-search-plugin'
const makeQuery = (search) => {
  if (search.length >= 4) {
    return { $ngram: search, year: { $lte: 2014 } };
  } else if (!!search.length) {
    return {
      $or: [
        { model: { $regex: new RegExp(`^${search}`, 'i'), }, },
        { make: { $regex: new RegExp(`^${search}`, 'i'), }, }
      ],
    };
  } else {
    return { year: { $lte: 2014 } };
  }
}
const [state, dispatch] = useReducer(reducer, initialState);

const query = useMemo(() => makeQuery(state.search), [state.search]);

const cursor = useCdnCursorQuery('cars', query, undefined, 0, 30);

  useEffect(() => {
    (async () => {
        let list = await cursor.next();
        dispatch({ type: 'load', list });
    })();
  }, [state.search, cursor])

  useEffect(() => {
    (async () => {
      if (await cursor.hasNext()) {
        let list = await cursor.next();
        dispatch({ type: 'loadMore', list })
      }
    })()
  }, [state.page]);

  const onKeyPress = (event) => {
    if (event.key === 'Enter') {
      dispatch({ type: 'enter' });
    }
  }

```

```jsx
      <input onChange={(e)=>(async ()=>{ 
        let list = await searchFetch(e.target.value)}
          setList(list)
        })()}/>

      <button onCLick={
        ()=>{
          (async ()=>{ 
          if(cursor&& cursor.hasNext()){
           let list = await cursor.next()
            setList([...prevList,...list])
          }
          })()
        }
      }>Load more</button>

```
### Live demo 
    
Kaggle dataset "Used Car Auction Prices" 500 000 row 

[live demo](https://gatsby-5o5.pages.dev/cars/)


[source code on github](https://github.com/vora-bei/gatsby-cdn-search-demo-site)
  
    
[source of data](https://www.kaggle.com/tunguz/used-car-auction-prices)


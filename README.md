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

### Usage

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
### Live demo 
    
Kaggle dataset "Used Car Auction Prices" 500 000 row 

[live demo](https://gatsby-5o5.pages.dev/cars/)


[source code on github](https://github.com/vora-bei/gatsby-cdn-search-demo-site)
  
    
[source of data](https://www.kaggle.com/tunguz/used-car-auction-prices)


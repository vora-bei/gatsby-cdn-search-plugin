/**
 * Implement Gatsby's SSR (Server Side Rendering) APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/ssr-apis/
 */
// You can delete this file if you're not using it
const React = require("react")

exports.onRenderBody = ({
  setHeadComponents,
}, pluginOptions) => {
  setHeadComponents([
    <link
      rel="prefetch"
      type="application/json"
      href={"/cdn-indice/" + pluginOptions.id + "/indices." + pluginOptions.id + '.json'}
      as="fetch"
      key={"cdn-base-" + pluginOptions.id}
    />,
    <link
    rel="prefetch"
    type="application/json"
    href={"/cdn-indice/" + pluginOptions.id + "/data." + pluginOptions.id + '/index.json'}
    as="fetch"
    key={"cdn-base-" + pluginOptions.id}
  />,
    ...pluginOptions.indices.map(({id}) => <link
    rel="prefetch"
    type="application/json"
    href={"/cdn-indice/" + pluginOptions.id + "/" + id + '/index.json'}
    as="fetch"
    key={"cdn-base-" + pluginOptions.id}
  />)
  ])
}


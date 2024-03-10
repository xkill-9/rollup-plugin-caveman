# rollup-plugin-caveman

🍣 A Rollup plugin to convert [Caveman](https://github.com/andrewchilds/caveman) templates to ES6 modules.

## Requirements

This plugin requires an [LTS](https://github.com/nodejs/Release) Node version (v16.0.0+) and Rollup v1.20.0+.

## Install

Using yarn:

```console
yarn add --dev rollup-plugin-caveman
```

Note that `caveman` is a peer dependency of this plugin that needs to be installed separately.

## Usage

Create a `rollup.config.js` [configuration file](https://www.rollupjs.org/guide/en/#configuration-files) and import the plugin:

```js
import caveman from 'rollup-plugin-caveman';

export default {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs',
  },
  plugins: [caveman()],
};
```

Then Caveman templates can be imported as ES6 modules.

Example:

Assuming we have a `userList.html` template with the following contents:

```html
<ul>
  {{- for d.users as user }}
  <li class="user">{{user.name}}</li>
  {{- end }}
</ul>
```

With an accompanying file `src/index.js`, we could import the template and use it like seen below:

```js
import UserList from './userList.html?caveman';

document.body.innerHTML = UserList.render({
  users: [
    { name: 'Ringo' },
    { name: 'Paul' },
    { name: 'George' },
    { name: 'John' },
  ],
});
```

The resulting ES6 module exposes a single `render` function that takes any arguments defined in the template and returns a string, if we loaded `src/index.js` in a browser, `body.innerHTML` would be replaced with:

```html
<ul>
  <li class="user">Ringo</li>
  <li class="user">Paul</li>
  <li class="user">George</li>
  <li class="user">John</li>
</ul>
```

The plugin also supports [partials](https://github.com/andrewchilds/caveman?tab=readme-ov-file#--render-partialname-) and by default it'll look for partials in the same directory as the template where they're being imported, you can also define especific paths to look for partial templates using the [`partialPaths`](#partialPaths) option.

## Options

### `exclude`

Type: `String` | `Array[...String]`<br>
Default: `null`

A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which specifies the files in the build the plugin should _ignore_. By default no files are ignored.

### `include`

Type: `String` | `Array[...String]`<br>
Default: `'**/*.html?caveman'`

A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.

### `partialPaths`

Type: `Array[...String]`<br>
Default: `[]`

A list of paths to search for partials in case they're not located in the same directory as the template.

## License

MIT

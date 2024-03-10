# rollup-plugin-caveman

🍣 A Rollup plugin to convert [Caveman](https://github.com/andrewchilds/caveman) templates to ES6 modules.

## Requirements

This plugin requires an [LTS](https://github.com/nodejs/Release) Node version (v16.0.0+) and Rollup v1.20.0+.

## Install

Using yarn:

```console
yarn add --dev rollup-plugin-caveman
```

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

```js
import MyTemplate from './template.html?caveman';

document.body.appendChild(MyTemplate.render({ message: 'Hello World!' }));
```

Where `template.html` is:

```html
<div>{{ d.message }}</div>
```

## Options

### `exclude`

Type: `String` | `Array[...String]`<br>
Default: `null`

A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which specifies the files in the build the plugin should _ignore_. By default no files are ignored.

### `include`

Type: `String` | `Array[...String]`<br>
Default: `'**/*.html?caveman'`

A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.

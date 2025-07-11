/// <reference types="vitest" />
import {type Plugin, defineConfig, createFilter} from "vite";
import vitePluginFaviconsInject from "vite-plugin-favicons-inject";
import inject from "@rollup/plugin-inject";
import peggy from "peggy";

import {readFileSync} from "fs";
import {resolve} from "path";
import {execSync} from "child_process";

let GIT_VERSION;
try {
  if (process.env.VITE_GIT_DATE && process.env.VITE_GIT_HASH) {
    GIT_VERSION = JSON.stringify(`${process.env.VITE_GIT_DATE}/${process.env.VITE_GIT_HASH}`);
  } else {
    GIT_VERSION = JSON.stringify(
      `${execSync("git log -1 --format=%cd --date=short", {
        encoding: "utf-8"
      }).trim()}/${execSync("git describe --always", {encoding: "utf-8"}).trim()}`
    );
  }
} catch (error) {
  console.warn("Git not available, using fallback version. Try with:");
  console.warn(`export GIT_DATE=$(git log -1 --format=%cd --date=short)
export GIT_HASH=$(git describe --always)`);
  GIT_VERSION = JSON.stringify("unknown");
}

const dependencies = JSON.parse(
  readFileSync("package.json", {encoding: "utf-8"})
)["dependencies"];
const APP_DEPENDENCIES = JSON.stringify(
  Object.keys(dependencies)
    .map((dependency) =>
      JSON.parse(
        readFileSync(`node_modules/${dependency}/package.json`, {
          encoding: "utf8"
        })
      )
    )
    .map(
      ({name, version, license}) =>
        `<a href="https://www.npmjs.com/package/${name}/v/${version}">${name}</a> ${version} (${license})`
    )
    .join(", ")
);

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: "./",
  optimizeDeps: {
    exclude: ["leaflet"]
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: [
        resolve(__dirname, "index.html"),
        resolve(__dirname, "land.html"),
        resolve(__dirname, "map.html")
      ]
    }
  },
  define: {
    APP_DEPENDENCIES,
    GIT_VERSION
  },
  plugins: [
    inject({
      exclude: /(css|pegjs)$/,
      $: "jquery",
      jQuery: "jquery"
    }),
    peggyPlugin(),
    vitePluginFaviconsInject("./turbo.svg")
  ],
  // https://vitest.dev/config/
  test: {
    environment: "happy-dom",
    include: ["tests/test*.ts"]
  }
}));

function peggyPlugin(options: peggy.ParserBuildOptions = {}): Plugin {
  return {
    name: "peggy",
    transform(grammar, id) {
      const {include = ["*.pegjs", "**/*.pegjs"], exclude} = options;
      const filter = createFilter(include, exclude);
      if (!filter(id)) return null;
      const code = peggy.generate(grammar, {output: "source", ...options});
      return {
        code: `export default ${code};`,
        map: {mappings: ""}
      };
    }
  };
}

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      // Tanimsiz degisken/import = calisma aninda ReferenceError, sayfa
      // komple beyaz kalir. Derleme bunu YAKALAMIYOR; iki kez Flas Urunler
      // sayfasi bu yuzden acilmadi. Bundan sonra lint durduruyor.
      "no-undef": "error",
      // no-undef JSX etiket adlarini GORMEZ (<Foo /> icin referans olusmaz).
      // Fiyatlar sayfasi eksik AlertDialogCancel importu yuzunden beyaz
      // kaldi ve lint bunu yakalamadi. Bu kural JSX tarafini kapatiyor.
      "react/jsx-no-undef": "error",
      // TANIMLANMADAN ONCE KULLANMA. no-undef bunu GORMEZ: degisken vardir,
      // yalnizca henuz baslatilmamistir (temporal dead zone). Bu projede uc
      // kez sayfa cokertti — Pazaryeri Urunleri'nde iki kez, Urunler'de
      // Excel yuklemesi sirasinda bir kez. Sonuncusu kisa devre yuzunden
      // sayfa acilisinda gorunmuyor, yalnizca yukleme baslayinca patliyordu.
      // UYARI seviyesinde: mevcut 40 kullanimin cogu zararsiz (JSX icinde ya
      // da tiklamayla calisan fonksiyonlarda; o an tanimlar tamamlanmis
      // oluyor). ESLint ikisini ayirt edemiyor, hepsini hata yapmak 25
      // dosyayi kazancsiz yere degistirmek olurdu.
      // Gercekten tehlikeli desen: bir const'un BASLATICISINDA baska bir
      // const'u kullanmak. Urunler sayfasinda Excel yuklemesini boyle
      // cokerttim; kisa devre yuzunden sayfa acilisinda gorunmuyordu.
      // Asil yakalayan uctan uca bot oldu (CSV adimi).
      "no-use-before-define": ["warn", { functions: false, classes: false, variables: true }],
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
];

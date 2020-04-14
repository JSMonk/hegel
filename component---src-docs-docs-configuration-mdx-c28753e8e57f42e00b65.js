(this.webpackJsonp=this.webpackJsonp||[]).push([[8],{1317:function(e,t,n){"use strict";n.r(t),n.d(t,"_frontmatter",(function(){return o})),n.d(t,"default",(function(){return s}));n(17),n(4),n(3),n(1),n(12),n(10),n(22);var a=n(59),i=n(65);n(36);function l(){return(l=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var a in n)Object.prototype.hasOwnProperty.call(n,a)&&(e[a]=n[a])}return e}).apply(this,arguments)}var o={};void 0!==o&&o&&o===Object(o)&&Object.isExtensible(o)&&!o.hasOwnProperty("__filemeta")&&Object.defineProperty(o,"__filemeta",{configurable:!0,value:{name:"_frontmatter",filename:"src/docs/docs/configuration.mdx"}});var r={_frontmatter:o},c=i.a;function s(e){var t=e.components,n=function(e,t){if(null==e)return{};var n,a,i={},l=Object.keys(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,["components"]);return Object(a.b)(c,l({},r,n,{components:t,mdxType:"MDXLayout"}),Object(a.b)("h1",{id:"configuration"},"Configuration"),Object(a.b)("hr",null),Object(a.b)("p",null,"Hegel initialy uses default configuration, but if you want to ignore some files inside your project or tell Hegel that you have a specific environment (",Object(a.b)("a",l({parentName:"p"},{href:"https://nodejs.org/en/"}),"Node.js")," for example) then you need to configure Hegel manually."),Object(a.b)("p",null,"To eject default configuration run:"),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"language-bash"}),"$ hegel init\nProject initialized.\n")),Object(a.b)("p",null,"After the command is executed ",Object(a.b)("inlineCode",{parentName:"p"},".hegelrc")," file will be created."),Object(a.b)("p",null,"By default ",Object(a.b)("inlineCode",{parentName:"p"},".hegelrc")," uses ",Object(a.b)("a",l({parentName:"p"},{href:"https://yaml.org/"}),"YAML")," format. But you have the ability to choose between YAML and JSON."),Object(a.b)("p",null,"The ",Object(a.b)("inlineCode",{parentName:"p"},".hegelrc")," consists of 4 sections:"),Object(a.b)("ul",null,Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"#environment"}),"environment")),Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"#exclude"}),"exclude")),Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"#include"}),"include")),Object(a.b)("li",{parentName:"ul"},Object(a.b)("a",l({parentName:"li"},{href:"#typings"}),"typings"))),Object(a.b)("h2",{id:"environment"},"environment"),Object(a.b)("p",null,'String, which defines the specific environment that should be used. For now only "nodejs" and "browser" options exist. By default Hegel  will not include any environment.'),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"language-yaml"}),"environment: browser\n# or\nenvironment: nodejs\n")),Object(a.b)("h2",{id:"exclude"},"exclude"),Object(a.b)("p",null,"Array of ",Object(a.b)("a",l({parentName:"p"},{href:"https://commandbox.ortusbooks.com/usage/parameters/globbing-patterns"}),"glob-pattern strings"),' that match files to be excluded from analysis. By default Hegel excludes all files in the "node_modules" directory.'),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"language-yaml"}),"exclude:\n  - ./node_modules/**\n  - ./dist/**\n  - specific.js\n")),Object(a.b)("h2",{id:"include"},"include"),Object(a.b)("p",null,"Array of ",Object(a.b)("a",l({parentName:"p"},{href:"https://commandbox.ortusbooks.com/usage/parameters/globbing-patterns"}),"glob-pattern strings")," that match files that should be analyzed. By default Hegel will analyze all files that end in ",Object(a.b)("inlineCode",{parentName:"p"},".js"),"."),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"language-yaml"}),"include:\n  - ./**/*.js\n  - ./components/*.jsx\n  - specific.mjs\n")),Object(a.b)("h2",{id:"typings"},"typings"),Object(a.b)("p",null,'Array of paths where Hegel should search for typings. Order is important because Hegel will try to find typings for specific libraries in the order they are defined. By default Hegel will first look inside the local directory "@types" and then inside "./node_modules/@types".'),Object(a.b)("blockquote",null,Object(a.b)("p",{parentName:"blockquote"},"If type definitions are placed inside a specific package you should not define this package path inside this configuration section.")),Object(a.b)("pre",null,Object(a.b)("code",l({parentName:"pre"},{className:"language-yaml"}),"types:\n  - ./@types\n  - ./custom-types\n  - ./node_modules/@types\n  - ./node_modules/custom-types\n")),Object(a.b)("blockquote",null,Object(a.b)("p",{parentName:"blockquote"},"Hegel will first try to find type definitions in the directories specified in the ",Object(a.b)("inlineCode",{parentName:"p"},"types")," configuration section. If type definitons are not found Hegel will search the ",Object(a.b)("inlineCode",{parentName:"p"},"node_modules")," directory. If Hegel can't find type definitions it will infer the types automatically.")))}void 0!==s&&s&&s===Object(s)&&Object.isExtensible(s)&&!s.hasOwnProperty("__filemeta")&&Object.defineProperty(s,"__filemeta",{configurable:!0,value:{name:"MDXContent",filename:"src/docs/docs/configuration.mdx"}}),s.isMDXComponent=!0}}]);
//# sourceMappingURL=component---src-docs-docs-configuration-mdx-c28753e8e57f42e00b65.js.map
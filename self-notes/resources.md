Session initialization:
https://clerk.com/blog/magic-links

configuring jest: https://jestjs.io/docs/next/configuration

    define jest in config file: jest.config.js
        - export an object

    can also be defined in 'jest' key in package.json file.
    or can reference file in pkg.json file (  "jest": "./path/to/config.json")

https://archive.jestjs.io/docs/en/23.x/getting-started.html

- i should use babel.config.js to transpile node_Modules --> details: https://babeljs.io/docs/config-files

https://babeljs.io/docs/configuration

- i can use one of 2 distinct file types for my config file based on my use case.

guide on config files: https://babeljs.io/docs/config-files/

- prefer .json static files to configure - since JS config files are less statically analyzable.

config file examples examples: https://github.com/jestjs/jest/blob/54f4d4ebd3d1a11d65962169f493ce41efdd784f/jest.config.js

no longer needed - it seems:

1. configuring code transformations: https://jestjs.io/docs/next/code-transformation

TAKEAWAYS:

- will need to use babel.config.js in order to transpile node_modules. See https://babeljs.io/docs/en/next/config-files for more information.
-

OTPs
https://www.freecodecamp.org/news/how-time-based-one-time-passwords-work-and-why-you-should-use-them-in-your-app-fdd2b9ed43c3/
https://datatracker.ietf.org/doc/html/rfc4226

https://mailtrap.io/blog/send-emails-with-nodejs/

https://github.dev/lorezi/duxfilm/blob/master/cmd/api/tokens.go#L62

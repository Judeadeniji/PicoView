[PicoView](https://picoview.vercel.app/)
=======================================
[![Build Status](https://travis-ci.org/Judeadeniji/PicoView.svg?branch=master)](https://travis-ci.org/Judeadeniji/PicoView)
[![Coverage Status](https://coveralls.io/repos/github/Judeadeniji/PicoView/badge.svg?branch=master)](https://coveralls.io/github/Judeadeniji/PicoView?branch=master)
[![Dependency Status](https://david-dm.org/Judeadeniji/PicoView.svg)](https://david-dm.org/Judeadeniji/PicoView)
[![devDependency Status](https://david-dm.org/Judeadeniji/PicoView/dev-status.svg)](https://david-dm.org/Judeadeniji/PicoView#info=devDependencies)
[![Known Vulnerabilities](https://snyk.io/test/github/Judeadeniji/PicoView/badge.svg)](https://snyk.io/test/github/Judeadeniji/PicoView)

A server-side web applications framework for building scalable user interfaces
------------------------------------------------------------------------------

[PicoView](https://picoview.vercel.app/) is a server-side web applications framework for building scalable frontend applications with less server-side code.

This branch tracks the development of PicoView **0.x**.


Getting Started
---------------
- See the [Getting Started](https://picoview.vercel.app/) for an introduction and Documentatio.
- See [Installation](https://picoview.vercel.app/installation) for instructions on installing PicoView.
- See [Discusions](https://github.com/Judeadeniji/PicoView/discussions) for questions and support.
- See [Issues](https://github.com/Judeadeniji/PicoView/issues) for bug reports and feature requests.
- See [Change Log] (https://picoview.vercel.app/changelog) for recent changes.
- See [Contributing](https://picoview.vercel.app/contributing) for contributing to the project.

Quick Start
-----------
```html
<div id="app">
    <h1>{message}</h1>
    <button on:click="reverseMessage">Reverse Message</button>
</div>

<script type="module">
    // import from unpkg
    import { createApp } from 'https://unpkg.com/picoview?module';

    const myApp = createApp('my-app')

    myApp.data({
        state: {
            message: 'Hello World!'
        },
        handlers: {
            reverseMessage() {
                this.message = this.message.split('').reverse().join('')
            }
        }
    })

    myApp.mount('#app', { spa: true })
</script>
```
The `{message}` is a placeholder for the `message` property which could be a `state` or `getter`. The `on:click` is a directive that binds the `reverseMessage` method to the `click` event of the button.

The `createApp` function creates a new PicoView application instance. The `data` method defines the application state and handlers. The `mount` method mounts the application to the DOM element with the id `app`.

Hold on, I know this looks like a frontend application, but let's make it a server-side application.

```go
package main

import (
    "net/http"
)

var message string = "Hello World!"

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/html")
        w.Write([]byte(`
            <div id="app">
                <h1 pv:data="{ message: `+message+` }">`+ message +`</h1>
                <button on:click="reverseMessage">Reverse Message</button>
            </div>

            <script type="module">
                // import from unpkg
                import { createApp } from 'https://unpkg.com/picoview?module';

                const myApp = createApp('my-app')

                myApp.data({
                    handlers: {
                        reverseMessage() {
                            this.message = this.message.split('').reverse().join('')
                        }
                    }
                })

                // we can decide to disable SPA
                myApp.mount('#app', { spa: false })
            </script>
        `))
    })

    http.ListenAndServe(":8080", nil)
}
```
The `pv:data` tells PicoView to use the `message` variable as the `message` state, that's why the message state was not defined in the `data` method. The `on:click` directive is still the same, but the `mount` method now has the `spa` option set to `false`.

The `spa` option only enables client side routing, and related features. It does not affect the server-side rendering.

contributing
------------
Want to contribute? Follow these [recommendations](https://picoview.vercel.app/contributing).

Become a Sponsor
----------------
PicoView is an MIT-licensed open source project with its ongoing development made possible entirely by the support of these awesome [sponsors](https://picoview.vercel.app/sponsors). If you'd like to join them, please consider:

- [Become a backer or sponsor on Open Collective](https://opencollective.com/picoview).

Website & Documentation
-----------------------
Visit the [https://picoview.vercel.app/](https://picoview.vercel.app/) for more information.


Develop Locally
---------------
```bash
# clone the repo
git clone

# change directory
cd PicoView

# install dependencies
npm install

# run the tests
npm test

# build for production
npm run build

# run the dev server
npm run dev
```

At this point, you can open your browser and visit `http://localhost:3000/test` to see the application running, and then add the tests under the `test` directory.
- `test/index.html` is the root file for the tests.
- `/test/attributes` contains the tests for the attributes.
- `/test/directives` contains the tests for the directives.
- `/test/elements` contains the tests for the elements.

PicoView uses [Mocha](https://mochajs.org/) as the test runner, and [Chai](https://www.chaijs.com/) as the assertion library.

Special Thanks
--------------
Special thanks to everyone, I love y'all.
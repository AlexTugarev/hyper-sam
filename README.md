# Hyper SAM

A framework for web apps powered by HyperHTML and the SAM pattern.

-   [HyperHTML](https://viperhtml.js.org/)
-   [SAM pattern](http://sam.js.org/)

## App Rendering

1.  Every component may be a stateless function. A wrapping **connect function** (cn) may be used to inject state or actions into the props. It also allows for DOM nodes to be reused at render.
2.  **Actions propose state updates**. Any action may be asynchronous and call external APIs (eg. validators).
3.  The **Accept function** updates the state. **The logic here may either accept or reject** action proposals and enforces a consistent state. It may be asynchronous too, to persist its data to a database for example. The state is a plain object, there is not immutability required.
4.  Actions may be called automatically if the state is in a particular shape via the optional **Next Action** function.

### Routing

Client side routing is supported via the [onpushstate package](https://github.com/WebReflection/onpushstate). A **route** action is called with the _old path_ string and the current _window.location_ object.

_Note:_ A default **route** action is defined for convenience:

`route: ({ oldPath, location, }) => ({ proposal: { route, query } })`.

## Package Usage

This package is published as a native ES Node module. If you have bundling problems, please try importing the files _client_ or _server_ inside _src_ directly, instead of using _index.mjs_.

## API and example usage

### App Interface

This framework is intended to render an app with a specific interface:

-   app: Render function, effectively just a component at the root level (see component examples below).
-   actions: An object containing **Action functions** which may be called from buttons, etc. They may be asynchronous functions and their return value is proposed to the **Accept function** of the model which may update the state. As a convention, the return value is an object with a _proposal_ property (`action: (arg) => ({ proposal })`).
-   accept: `({ proposal }) => void` : This is the **Accept function** of the model.
-   nextAction: `({ state, actions }) => void` : This function may call **Action** according to some state. It is automatically called after each state update.

An example app:

```javascript
export const Actions = ({ propose }) => {
    return {
        async exampleAction({ value }) {
            if (typeof value !== "string") {
                return;
            }
            await propose({ proposal: { value } });
        },
    };
};

const Accept = ({ state }) => {
    return ({ proposal }) => {
        if (proposal.route !== undefined) {
            state.route = proposal.route;
        }
        if (proposal.value !== undefined) {
            state.bar = proposal.value;
        }
    };
};

// Optional
const nextAction = ({ state, actions }) => {
    if (state.foo) {
        actions.exampleAction({ value: "abc" });
    }
};
```

### Client Constructor

-   A factory produces an app instance.
-   By default it will restore the server-side-rendered state.
-   While the page parses client-side code, a dispatch function may record actions to be replayed when the client app is ready.
-   Will do an initial render.

```javascript
import { ClientApp } from "hypersam";
// app-shell is our app logic with a model, and actions.
import { appShell, Actions, Accept, nextAction } from "./app-shell";

const { accept, actions } = ClientApp({
    state, // Initial state (eg. empty arrays instead of undefined, keep API consistent for render). Only required without server-side render.
    app: appShell, // the root render function
    rootElement: document.body,
    Accept, // the update function for the state
    Actions, // an object of functions which propose state updates
    nextAction, // optional, automatic actions according to state
})
    .then(({ accept, actions }) => {
        // May call accept or actions manually here.
    })
    .catch(error => {
        console.error("App error", error);
    });
```

### Server Constructor

-   A factory produces an object with two fields.
-   The first is a function which renders an HTML string of the app.
-   The second is the app-model Accept function. The app state may be updated with this function in order to reuse the model's logic.

```javascript
import { SsrApp } from "hypersam";
// app-shell is our app logic with a model, and actions.
// actions are optional, automatic next-action not yet supported
import { appShell, Accept } from "./app-shell";

const state = { /* ... */ }; // Initial state (eg. empty arrays instead of undefined, keep API consistent for render).
const { renderHTMLString, accept } = SsrApp({
    state,
    app: appShell,
    Accept,
});
// ... may get data to propose to model here
await accept({ route, query, title, description, posts });
const appString = renderHTMLString();
// insert into HTML body ...
```

### Connect Function

The connect function (_cn_) passes some default props to a view:

1.  state: the application state.
2.  actions: an object of the app's actions.
3.  render: used to render a view.
4.  cn: a connect function to be used for child components.
5.  dispatch: a function for click handlers to record actions while the client logic initialises (used with server-side rendering).
6.  \_wire: a HyperHTML render function to force recreation of DOM nodes.

Please also refer to the [HyperHTML docs](https://viperhtml.js.org/hyperhtml/documentation/#essentials-1).

```javascript
// one or two arguments
cn(
    component, // function : props => props.render`<!-- HTML -->`
    childProps, // object : Optional, will be merged into child's props
);
// three or four arguments
cn(
    component,
    childProps,
    reference, // object|null : Object to weakly bind DOM nodes to (see hyperhtml)
    nameSpace, // number|string : Optional, used, if component is used multiple times in same view
);
```

### Basic component example

```javascript
const fetchButtonConnected = props => {
    const childProps = {
        parentProp: props.parentProp,
        fetchData: props.actions.fetchData,
        someState: props.state.someState,
    };
    return props.cn(fetchButton, childProps);
};

const fetchButton = ({ render, parentProp, fetchData, someState }) => {
    return render`
        <button onclick=${fetchData}>
            State ${someState}-${parentProp}
        </button>
        `;
};
```

### Render reference example

A list component may use render references to free memory when list items are removed from state:

```javascript
const postsConnected = props => {
    const childProps = {
        posts: props.state.posts,
        fetchPosts: props.actions.fetchPosts,
    };
    return props.cn(posts, childProps);
};

const posts = props => {
    const { render, cn, posts, fetchPosts } = props;
    return render`
        <button onclick=${FetchPosts({ fetchPosts })}>Fetch Posts</button>
        <ul class="posts">
            ${posts.map(post => cn(postItem, { ...post }, post))}
        </ul>
        `;
};

const postItem = props => {
    const { render, cn, title, summary, content } = props;
    return render`
        <li class="posts posts__post">
            <p class="posts posts__title">${title}</p>
            ${cn(postSummary, { summary })}
            <p class="posts posts__content">${content}</p>
        </li>
        `;
};

const postSummary = props => {
    const { render, summary } = props;
    return render`
        <p class="posts posts__summary">${summary}</p>
        `;
};
```

### Dispatch function example

```javascript
const view = props => {
    const { render, dispatch, fetchPosts } = props;
    const args = [1, 2];
    const onClick = dispatch("fetchPosts", FetchPostsSSR, ...args);
    return render`
        <button onclick=${onClick}>Fetch Posts SSR</button>
        `;
};

const FetchPostsSSR = (...args) => {
    return function(event, action) {
        action();
    };
```

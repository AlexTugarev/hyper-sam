export const ssrDefaultProps = ({ state, dispatch, wire }) => {
    return Object.assign(Object.create(null), {
        state,
        actions: Object.create(null),
        dispatch,
        render: wire(),
        _wire: wire,
    });
};

export const ssrDispatch = (_name, _handler, ..._args) => `{
    const name = '${_name}';
    const handler = (${_handler});
    const args = ${JSON.stringify(_args)};
    window.dispatcher.toReplay.push({
        name,
        handler,
        args,
        target: this,
        event,
    });
}`;

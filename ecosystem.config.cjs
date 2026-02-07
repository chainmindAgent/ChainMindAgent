module.exports = {
    apps: [{
        name: "chainmind",
        script: "src/web/server.ts",
        interpreter: "node",
        interpreter_args: "--import tsx/esm",
        env: {
            NODE_ENV: "production"
        }
    }]
}

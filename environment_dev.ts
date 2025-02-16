import "./environment";
import "@phading/cluster/environment_dev";

globalThis.PORT = 8080;
globalThis.BUILDER_ACCOUNT = "hello-world-service-builder";
globalThis.SERVICE_ACCOUNT = "hello-world-service-account";
globalThis.DB_NAME = "hello-world-db";
globalThis.SERVICE_NAME = "hello-world-service";

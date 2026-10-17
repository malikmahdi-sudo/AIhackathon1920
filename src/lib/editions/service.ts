import "server-only";
import path from "node:path";
import { createEditionStore } from "./store";

export const editions = createEditionStore(path.join(process.cwd(), "data", "editions"));

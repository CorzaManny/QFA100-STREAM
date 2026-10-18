import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH is "/QFA100-STREAM/" while the site lives at
// <user>.github.io/QFA100-STREAM/, and "/" once live.qfa100.org points at it
// (set by the deploy workflow from the BASE_PATH repo variable).
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
});

(function (root) {
  "use strict";

  function create({ loadTesseract, startupTimeout = 60000, recognitionTimeout = 20000 }) {
    const entries = new Map();
    let generation = 0;
    const cancelled = () => new DOMException("OCR cancelled", "AbortError");
    function deadline(promise, ms) {
      let timer;
      return Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("OCR timeout")), ms);
      })]).finally(() => clearTimeout(timer));
    }
    function discard(entry) {
      entry.invalid = true;
      if (entries.get(entry.language) === entry) entries.delete(entry.language);
      if (entry.worker) {
        const worker = entry.worker;
        entry.worker = null;
        Promise.resolve(worker.terminate()).catch(() => {});
      }
    }
    function getEntry(language) {
      if (entries.has(language)) return entries.get(language);
      const entry = { language, generation, invalid: false, worker: null, tail: Promise.resolve() };
      entries.set(language, entry);
      // Keep one numeric worker and one text worker; parameters and recognition
      // are serialized on each worker so simultaneous crops cannot mix settings.
      const startup = Promise.resolve().then(loadTesseract).then(async engine => {
        if (!engine?.createWorker) throw new Error("OCR unavailable");
        if (entry.invalid || entry.generation !== generation) throw cancelled();
        const worker = await engine.createWorker(language, 1);
        if (entry.invalid || entry.generation !== generation) {
          await worker.terminate();
          throw cancelled();
        }
        entry.worker = worker;
        return worker;
      });
      entry.ready = deadline(startup, startupTimeout).catch(error => { discard(entry); throw error; });
      return entry;
    }
    function recognize(canvas, language = "eng", parameters = {}) {
      if (!["eng", "chi_tra+eng"].includes(language)) return Promise.reject(new Error("Unsupported OCR language"));
      const entry = getEntry(language);
      // Observe startup immediately even when another job is queued.
      const ready = entry.ready.then(worker => ({ worker }), error => ({ error }));
      const task = entry.tail.then(async () => {
        const result = await ready;
        if (result.error) throw result.error;
        if (entry.invalid || entry.generation !== generation) throw cancelled();
        try {
          const output = await deadline((async () => {
            await result.worker.setParameters({ tessedit_pageseg_mode: "7", tessedit_char_whitelist: "", ...parameters });
            return result.worker.recognize(canvas);
          })(), recognitionTimeout);
          if (entry.invalid || entry.generation !== generation) throw cancelled();
          return output;
        } catch (error) {
          discard(entry);
          throw error;
        }
      });
      entry.tail = task.catch(() => {});
      return task;
    }
    function release() {
      generation += 1;
      for (const entry of entries.values()) discard(entry);
      entries.clear();
    }
    return { recognize, release };
  }
  root.MapleCombatOcr = { create };
})(typeof window === "undefined" ? globalThis : window);

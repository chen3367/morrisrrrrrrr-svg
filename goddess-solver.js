(function (root) {
  "use strict";
  const combinations = [];
  for (let left = 5; left >= 0; left--) {
    for (let center = 5 - left; center >= 0; center--) combinations.push(`${left}${center}${5 - left - center}`);
  }
  Object.freeze(combinations);
  const validGuess = guess => typeof guess === "string" && combinations.includes(guess);
  function feedback(guess, answer) {
    if (!validGuess(guess) || !validGuess(answer)) throw new Error("站位總人數必須為 5 人。");
    return [...guess].reduce((total, digit, i) => total + Number(digit === answer[i]), 0);
  }
  function candidates(history) {
    if (!Array.isArray(history) || history.length > 7) throw new Error("試站紀錄無效。");
    let remaining = [...combinations];
    history.forEach((entry, index) => {
      if (!entry || !validGuess(entry.guess) || ![0, 1, 3].includes(entry.feedback) ||
          (index > 0 && history[index - 1].feedback === 3)) throw new Error("試站紀錄無效。");
      remaining = remaining.filter(answer => feedback(entry.guess, answer) === entry.feedback);
    });
    return remaining;
  }
  function recommend(remaining) {
    if (!remaining.length) return null;
    // Minimax over the two failure responses; success ends the search immediately.
    let best = null;
    let score = [Infinity, Infinity];
    for (const guess of remaining) {
      const sizes = [0, 0, 0, 0];
      remaining.forEach(answer => sizes[feedback(guess, answer)]++);
      const next = [Math.max(sizes[0], sizes[1]), sizes[0] ** 2 + sizes[1] ** 2];
      if (next[0] < score[0] || (next[0] === score[0] && next[1] < score[1])) {
        best = guess;
        score = next;
      }
    }
    return best;
  }
  function currentGuess(history) {
    return history.length ? recommend(candidates(history)) : "500";
  }
  function append(history, guess, result) {
    candidates(history);
    if (history.length >= 7 || history.at(-1)?.feedback === 3) throw new Error("本輪已結束，請開始新一輪。");
    const next = [...history, { guess, feedback: result }];
    if (!candidates(next).length) throw new Error("此回覆與先前紀錄矛盾，未加入紀錄。請確認站位與 NPC 回覆，或撤銷上一筆。");
    return next;
  }
  const api = Object.freeze({ combinations, validGuess, feedback, candidates, recommend, currentGuess, append });
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MapleGoddessSolver = api;
})(typeof window === "object" ? window : globalThis);

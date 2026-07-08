// Logik susun atur teks yang dikongsi antara penjana PDF (pelayan) dan
// pratonton penyunting (pelanggan) supaya pemaparan konsisten (WYSIWYG).

/**
 * Penyambung nama yang lebih diutamakan sebagai titik pemenggalan baris.
 * Nama Melayu: bin/binti/binte/bte · Nama India: a/l, a/p, s/o, d/o.
 * Baris dipenggal SELEPAS penyambung ini (penyambung kekal di hujung baris atas),
 * cth. "Muhammad Firdaus bin" / "Abdul Rahman".
 */
export const NAME_CONNECTORS = new Set([
  "bin",
  "binti",
  "binte",
  "bte",
  "a/l",
  "a/p",
  "s/o",
  "d/o",
]);

function isConnector(word: string, connectors?: Set<string>): boolean {
  if (!connectors) return false;
  return connectors.has(word.toLowerCase().replace(/[.,]+$/, ""));
}

/**
 * Balut teks kepada baris yang muat dalam maxWidth (balutan peringkat perkataan).
 * `measure(s)` mengembalikan lebar teks pada saiz fon semasa.
 * Jika `connectors` diberi, baris diutamakan berpenggal selepas penyambung nama
 * (hanya apabila balutan memang diperlukan).
 */
export function wrapLines(
  text: string,
  measure: (s: string) => number,
  maxWidth: number,
  connectors?: Set<string>,
): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let i = 0;
    while (i < words.length) {
      // Cari perkataan terjauh (end) yang masih muat dalam satu baris
      let end = i;
      let lineStr = words[i];
      for (let j = i + 1; j < words.length; j++) {
        const trial = `${lineStr} ${words[j]}`;
        if (measure(trial) <= maxWidth) {
          lineStr = trial;
          end = j;
        } else {
          break;
        }
      }
      // Utamakan penggal selepas penyambung nama — hanya jika balutan diperlukan
      // (masih ada perkataan selepas 'end').
      let breakAt = end;
      if (connectors && end < words.length - 1) {
        for (let k = end; k > i; k--) {
          if (isConnector(words[k], connectors) && k < words.length - 1) {
            breakAt = k;
            break;
          }
        }
      }
      out.push(words.slice(i, breakAt + 1).join(" "));
      i = breakAt + 1;
    }
  }
  return out;
}

/** Kecilkan saiz fon sehingga teks muat dalam satu baris. */
export function shrinkSize(
  text: string,
  measureAt: (s: string, size: number) => number,
  size: number,
  maxWidth: number,
  min = 6,
): number {
  let s = size;
  while (s > min && measureAt(text, s) > maxWidth) s -= 0.5;
  return s;
}

/** Nilai nama sentiasa dicetak dalam huruf besar pada sijil. */
export function nameForPrint(name: string): string {
  return name.toUpperCase();
}

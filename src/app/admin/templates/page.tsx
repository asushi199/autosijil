import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { templateBgUrl } from "@/lib/storage";
import type { Template } from "@/lib/types";
import { createTemplate } from "../actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const db = adminClient();
  const { data: templates } = await db
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Template[]>();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Templat Sijil</h1>
      </div>

      <form action={createTemplate} className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="label" htmlFor="name">Nama templat baharu</label>
          <input id="name" name="name" className="input" placeholder="cth. Sijil Bengkel 2026" required />
        </div>
        <div>
          <label className="label" htmlFor="orientation">Orientasi A4</label>
          <select id="orientation" name="orientation" className="input w-auto">
            <option value="landscape">Melintang (landscape)</option>
            <option value="portrait">Menegak (portrait)</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">+ Cipta Templat</button>
      </form>

      {!templates?.length ? (
        <div className="card py-12 text-center text-gray-500">
          Tiada templat lagi. Cipta templat dan muat naik imej latar A4 (PNG/JPG) —
          boleh direka dalam Canva atau PowerPoint kemudian eksport sebagai imej.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const bg = templateBgUrl(t.bg_image_path);
            return (
              <Link key={t.id} href={`/admin/templates/${t.id}`} className="card p-3 hover:border-blue-400">
                <div
                  className={`mb-2 w-full overflow-hidden rounded-lg border border-gray-100 bg-gray-50 ${
                    t.orientation === "landscape" ? "aspect-[1.414/1]" : "aspect-[1/1.414]"
                  }`}
                >
                  {bg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bg} alt={t.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      Tiada imej latar
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">
                  {t.orientation === "landscape" ? "A4 melintang" : "A4 menegak"} ·{" "}
                  {(t.elements ?? []).length} elemen teks
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

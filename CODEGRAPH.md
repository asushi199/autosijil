# Code Graph — Sistem e-Sijil & Kehadiran

```mermaid
flowchart TB
  Browser["Pengguna / Pelayar"]
  Proxy["src/proxy.ts\nLindungi /admin dan /api/admin"]

  subgraph Public["Aliran Awam"]
    PublicPage["/e/[slug]\npage.tsx"]
    Attendance["AttendanceForm.tsx"]
    Check["SemakSijil.tsx"]
    AttendAPI["POST /api/e/[slug]/hadir"]
    CheckAPI["POST /api/e/[slug]/semak"]
    DownloadAPI["GET /api/e/[slug]/sijil"]
  end

  subgraph Admin["Aliran Pentadbir"]
    Login["/login"]
    Dashboard["/admin\nProgram & kehadiran"]
    EventEditor["Cipta / sunting program\nEventEditor.tsx"]
    TemplateEditor["Sunting templat\nTemplateEditor.tsx"]
    Actions["admin/actions.ts\nCRUD, import, log masuk"]
    AdminExports["API admin\nCSV • PDF gabung • ZIP\nsijil seorang • sampel • pratonton"]
  end

  subgraph Domain["Perkhidmatan Domain"]
    Auth["lib/admin-auth.ts\nKuki HMAC kata laluan"]
    SijilData["lib/sijil-data.ts\nMuat konteks & nilai sijil"]
    Token["lib/token.ts\nToken muat turun sijil"]
    PDF["lib/pdf.ts\nJana PDF on-demand"]
    Layout["lib/text-layout.ts\nBalut / kecilkan teks"]
    Storage["lib/storage.ts\nURL imej latar"]
    Types["lib/types.ts\nJenis & nilai lalai templat"]
    SupabaseClient["lib/supabase/admin.ts\nadminClient() — pelayan sahaja"]
  end

  subgraph External["Supabase"]
    Events[("events")]
    Attendees[("attendees")]
    Templates[("templates")]
    Bucket[("Storage: templates")]
  end

  Browser --> PublicPage
  PublicPage --> Attendance --> AttendAPI
  PublicPage --> Check --> CheckAPI --> DownloadAPI
  DownloadAPI --> Token

  Browser --> Login --> Actions
  Browser --> Proxy --> Dashboard
  Proxy --> Auth
  Dashboard --> EventEditor --> Actions
  Dashboard --> TemplateEditor --> Actions
  Dashboard --> AdminExports
  Actions --> Auth

  AttendAPI --> SijilData
  CheckAPI --> SijilData
  DownloadAPI --> SijilData --> PDF
  AdminExports --> SijilData
  AdminExports --> PDF
  TemplateEditor --> Layout
  PDF --> Layout
  PDF --> Types
  TemplateEditor --> Storage
  Actions --> Storage

  PublicPage --> SupabaseClient
  AttendAPI --> SupabaseClient
  CheckAPI --> SupabaseClient
  DownloadAPI --> SupabaseClient
  Actions --> SupabaseClient
  AdminExports --> SupabaseClient
  SupabaseClient --> Events
  SupabaseClient --> Attendees
  SupabaseClient --> Templates
  Storage --> Bucket
```

## Ringkasan sempadan tanggungjawab

- **Awam**: peserta merekod kehadiran dan memuat turun sijil melalui pautan program.
- **Pentadbir**: semua laluan `/admin` dan `/api/admin` disaring oleh `proxy.ts`; tindakan
  mutasi dikumpulkan dalam `src/app/admin/actions.ts`.
- **Domain**: `sijil-data.ts` menukar data program/peserta kepada nilai sijil, manakala
  `pdf.ts` menjana PDF pada masa permintaan tanpa menyimpan fail PDF.
- **Data**: hanya `adminClient()` berhubung dengan Supabase. Jadual utama ialah `events`,
  `attendees`, dan `templates`; imej latar templat berada dalam baldi `templates`.

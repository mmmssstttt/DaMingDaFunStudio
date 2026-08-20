const asset = (path) => `${import.meta.env.BASE_URL}${path}`

export const works = [
  {
    slug: 'foxbat-education-kit',
    title: '狐蝠生態教具箱',
    subtitle: 'Ecology Education Kit',
    summary: '便攜收納 / 雙面展示 / 標本防護 / 現場教學',
    description:
      '為洄瀾風生態有限公司設計一套可攜式環境教育教具，將狐蝠排遺、食渣標本、圖鑑與教學用品整合進木製提箱。設計從實際攤位操作出發，兼顧攜帶、收納、防護與展示，讓教學人員抵達現場後能快速展開使用。',
    year: '2025',
    client: '洄瀾風生態有限公司',
    scope: '產品設計、3D 建模、雷射切割、木作與實體製作',
    highlight:
      '可抽取的標本收納架以兩種槽位分別處理運送固定與展示拿取，翻面後即可成為桌上展示架；箱蓋則整合 A4 文件收納，讓一只提箱同時完成運送與教學布置。',
    cover: asset('images/works/foxbat/cover.webp'),
    coverAlt: '手持狐蝠標本收納架，架上排列多張標本卡',
    gallery: [
      {
        src: asset('images/works/foxbat/cover.webp'),
        alt: '手持裝有狐蝠食渣與排遺標本卡的收納架',
        caption: '標本卡與可攜式收納架',
      },
      {
        src: asset('images/works/foxbat/specimen-detail.webp'),
        alt: '透明標本盒與雷雕資訊整合在木製標本卡上',
        caption: '標本卡細節與雷雕辨識資訊',
      },
      {
        src: asset('images/works/foxbat/display-rack.webp'),
        alt: '標本收納架翻面後作為桌上展示架',
        caption: '收納架翻面後轉換為展示模式',
      },
      {
        src: asset('images/works/foxbat/case-closed.webp'),
        alt: '關閉的木製狐蝠生態教具提箱',
        caption: '便於攜帶與運送的木製箱體',
      },
      {
        src: asset('images/works/foxbat/case-open.webp'),
        alt: '打開的教具箱內放有標本收納架與文件空間',
        caption: '箱內整合標本、文件與教學用品',
      },
    ],
  },
  {
    slug: 'folding-market-cart',
    title: '摺疊攤車設計',
    subtitle: 'Mobile Market Cart',
    summary: '充氣展開 / 摺疊骨架 / 滑軌伸縮 / 氣候應變',
    description:
      '以台灣市集面對烈日與突發風雨的使用情境為起點，結合充氣棚體、摺疊骨架、滑軌與伸縮桿，提出一座能快速展開、靈活切換遮蔽模式的行動商舖。整體收納後回到緊湊盒型，在移動效率、空間彈性與攤售機能之間取得平衡。',
    year: '2026',
    client: '自主概念案',
    scope: '產品設計、機構設計、情境研究與概念視覺化',
    highlight:
      '桌面、棚架與充氣遮蔽結構被整合為同一套展收系統，可依日照、降雨與攤位尺度調整使用型態，讓攤主用更少的搬運量應對多變的戶外環境。',
    cover: asset('images/works/folding-cart/cover.webp'),
    coverAlt: '摺疊攤車設置於城市市集中的使用情境提案',
    gallery: [
      {
        src: asset('images/works/folding-cart/cover.webp'),
        alt: '城市市集中的摺疊攤車與棚體配置',
        caption: '行動市集使用情境與整體配置',
      },
      {
        src: asset('images/works/folding-cart/weather-modes.webp'),
        alt: '摺疊攤車因應晴天與雨天的兩種展開模式',
        caption: '晴雨模式切換與充氣棚體概念',
      },
      {
        src: asset('images/works/folding-cart/mechanism.webp'),
        alt: '滑軌、伸縮桿與摺疊骨架的機構拆解圖',
        caption: '滑軌、伸縮桿與摺疊骨架構造',
      },
      {
        src: asset('images/works/folding-cart/folding-system.webp'),
        alt: '攤車桌面與骨架由展開狀態收折為盒型的步驟',
        caption: '收折至盒型的機構與桌面配置',
      },
    ],
  },
  {
    slug: 'kendo-scoreboard',
    title: '劍道比賽計分板設計',
    subtitle: 'Kendo Scoreboard System',
    summary: '磁吸模組 / 25°支撐 / 可書寫表面 / 戰績分析',
    description:
      '從劍道賽事的現場紀錄與賽後分析需求出發，整合可書寫計分板、磁吸配件與戰績表格。計分板以 25° 傾斜支撐提升閱讀與站立穩定性，模組可依比賽配置調整；表格則分別對應團體賽、個人賽，以及選手得分與失分分析。',
    year: '2025',
    client: '個人委託',
    scope: '產品設計、3D 建模、操作規劃與戰績表格設計',
    highlight:
      '設計不只記錄當下比分，也把主動技、應對技、攻擊部位與得失分轉為可追蹤的資料，讓一整天的賽事紀錄能延伸成選手後續訓練的分析依據。',
    cover: asset('images/works/kendo-scoreboard/cover.webp'),
    coverAlt: '可站立與折疊的劍道比賽計分板模型',
    gallery: [
      {
        src: asset('images/works/kendo-scoreboard/cover.webp'),
        alt: '劍道比賽計分板展開後的正反面模型',
        caption: '可折疊的計分板整體構成',
      },
      {
        src: asset('images/works/kendo-scoreboard/configuration.webp'),
        alt: '計分板與配件收納的兩種配置',
        caption: '配件與書寫面的配置方式',
      },
      {
        src: asset('images/works/kendo-scoreboard/magnetic-layout.webp'),
        alt: '計分板磁吸配件與內部版面配置',
        caption: '可彈性移動的磁吸模組',
      },
      {
        src: asset('images/works/kendo-scoreboard/support.webp'),
        alt: '計分板背面的傾斜式支撐結構',
        caption: '提升閱讀與穩定性的 25° 支撐',
      },
      {
        src: asset('images/works/kendo-scoreboard/team-sheet.webp'),
        alt: '劍道團體賽戰績表填寫範例',
        caption: '團體賽戰績表',
      },
      {
        src: asset('images/works/kendo-scoreboard/individual-sheet.webp'),
        alt: '劍道個人賽戰績表填寫範例',
        caption: '個人賽戰績表',
      },
      {
        src: asset('images/works/kendo-scoreboard/score-sheet.webp'),
        alt: '劍道選手得分統計表填寫範例',
        caption: '選手得分與技法統計',
      },
      {
        src: asset('images/works/kendo-scoreboard/lost-score-sheet.webp'),
        alt: '劍道選手失分統計表填寫範例',
        caption: '選手失分與應對技分析',
      },
    ],
  },
]

export const members = [
  {
    slug: 'sho',
    name: 'Sho',
    portrait: '/images/members/sho.png',
    role: '商務拓展經理',
    experience: ['資源媒合', '客情維繫', '以大明大 Fun 的活力推進合作'],
    projects: ['劍道比賽計分板設計'],
  },
  {
    slug: 'eleanor',
    name: 'Eleanor',
    portrait: '/images/members/eleanor.png',
    role: '專案管理、體驗設計師',
    experience: ['團隊領導', '邏輯分析', '快速掌握問題並梳理專案方向'],
    projects: ['摺疊攤車設計'],
  },
  {
    slug: 'alvin',
    name: 'Alvin',
    portrait: '/images/members/alvin.png',
    role: '創意技術總監',
    experience: ['3D 建模', '機構設計', '產品打樣與細節整合'],
    projects: ['狐蝠生態教具箱'],
  },
]

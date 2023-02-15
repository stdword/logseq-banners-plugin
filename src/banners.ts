import "@logseq/libs";
import { SettingSchemaDesc, AppGraphInfo } from "@logseq/libs/dist/LSPlugin.user";

import mainStyles from "./banners.css";
import { logseq as PL } from "../package.json";


type AssetDataList = {
  [prop: string]: AssetData;
}

type AssetData = {
  title?: string;
  banner?: string;
  bannerHeight?: string;
  bannerAlign?: string;
}

type WidgetsConfig = {
  calendar?: any;
  quote?: any;
}

const pluginId = PL.id;

let doc: Document;
let root: HTMLElement;
let body: HTMLElement;

let isJournal: boolean;
let isHome: boolean;
let isPage: boolean;

let currentGraph: AppGraphInfo | null;
let defaultConfig: AssetDataList;
let widgetsConfig: WidgetsConfig;
let oldWidgetsConfig: WidgetsConfig;

let lastBannerURL: string;
let autoPageBanner: boolean;
const autoPageBannerURLPattern = "https://source.unsplash.com/1200x${height}?${title}";

const pluginPageProps: Array<string> = ["banner", "banner-align", "color"];

const settingsDefaultPageBanner = "https://wallpaperaccess.com/full/1146672.jpg";
const settingsDefaultJournalBanner = "https://images.unsplash.com/photo-1646026371686-79950ceb6daa?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1034&q=80";

const widgetsQuoteCleanupRegExps: RegExp[] = [
  /\n[^:]+::[^\n]*/g,
  /\nDEADLINE:.<[^>]+>/g,
  /\nSCHEDULED:.<[^>]+>/g,
  /\[\[/g,
  /\]\]/g,
  /#[^ #\n]+/g,
  /#\[\[[^\]\n]+\]\]/g,
  /==/g,
  /\^\^/g,
];

const settingsArray: SettingSchemaDesc[] = [
  {
    key: "widgetsCalendarHeading",
    title: "📅 Widgets: calendar",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "widgetsCalendarEnabled",
    title: "Show calendar?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["off", "journals", "everywhere"],
    default: "journals",
  },
  {
    key: "widgetsCalendarWidth",
    title: "Block calendar widget width (in px)",
    description: "",
    type: "string",
    default: "380px",
  },



  {
    key: "widgetsQuoteHeading",
    title: "💬 Widgets: quote",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "widgetsQuoteEnabled",
    title: "Show random quote?",
    description: "⚠ check readme for instructions! https://github.com/yoyurec/logseq-banners-plugin",
    type: "enum",
    enumPicker: "radio",
    enumChoices: ["off", "journals", "everywhere"],
    default: "journals",
  },
  {
    key: "widgetsQuoteTag",
    title: "Show random quotes with this tag",
    description: "",
    type: "string",
    default: "#quote",
  },
  {
    key: "widgetsQuoteMaxWidth",
    title: "Quote width limit (in chars)",
    description: "",
    type: "string",
    default: "48ch",
  },
  {
    key: "widgetsQuoteSize",
    title: "Quote font size (relative to default calculated, in %)",
    description: "",
    type: "string",
    default: "100%",
  },



  {
    key: "journalHeading",
    title: "📆 Journal and home settings",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "defaultJournalBanner",
    title: "Default banner for journal and home page (set empty to disable)",
    description: "",
    type: "string",
    default: settingsDefaultJournalBanner,
  },
  {
    key: "journalBannerHeight",
    title: "Banner height for journal & home page",
    description: "",
    type: "string",
    default: "280px",
  },
  {
    key: "journalBannerAlign",
    title: "Default banner vertical align for journal and home page",
    description: "",
    type: "string",
    default: "50%"
  },



  {
    key: "pageHeading",
    title: "📄 Common page settings",
    description: "",
    type: "heading",
    default: null
  },
  {
    key: "defaultPageBanner",
    title: "Default banner for common page (set empty to disable)",
    description: "",
    type: "string",
    default: settingsDefaultPageBanner,
  },
  {
    key: "pageBannerHeight",
    title: "Banner height for common page",
    description: "",
    type: "string",
    default: "280px",
  },
  {
    key: "pageBannerAlign",
    title: "Default banner vertical align for common page",
    description: "",
    type: "string",
    default: "50%"
  },
  {
    key: "autoPageBanner",
    title: "Turn on auto page banner mode?",
    type: "boolean",
    description: "Autogenerate banner image URL according to the page tile",
    default: "false",
  },
]


const readPluginSettings = () => {
  oldWidgetsConfig = { ...widgetsConfig };
  widgetsConfig = {
    calendar: {},
    quote: {},
  };
  defaultConfig = {
    page: {},
    journal: {}
  }

  if (logseq.settings) {
    ({
      widgetsCalendarEnabled: widgetsConfig.calendar.enabled,
      widgetsCalendarWidth: widgetsConfig.calendar.width,
      widgetsQuoteEnabled: widgetsConfig.quote.enabled,
      widgetsQuoteTag: widgetsConfig.quote.tag,
      widgetsQuoteMaxWidth: widgetsConfig.quote.maxwidth,
      widgetsQuoteSize: widgetsConfig.quote.size,
      defaultPageBanner: defaultConfig.page.banner,
      pageBannerHeight: defaultConfig.page.bannerHeight,
      pageBannerAlign: defaultConfig.page.bannerAlign,
      autoPageBanner,
      defaultJournalBanner: defaultConfig.journal.banner,
      journalBannerHeight: defaultConfig.journal.bannerHeight,
      journalBannerAlign: defaultConfig.journal.bannerAlign,
    } = logseq.settings);
  }
  encodeDefaultBanners();
}

const getBase64FromUrl = async (url: string): Promise<string> => {
  let data;
  try {
    data = await fetch(url);
  } catch (error) {
    return "";
  }
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data);
    }
  });
}

// Get and encode default banners for caching
// skip caching if random image from Unsplash API used
const encodeDefaultBanners = async () => {
  if (!autoPageBanner && defaultConfig.page.banner && !(defaultConfig.page.banner?.includes("source.unsplash.com"))) {
    defaultConfig.page.banner = await getBase64FromUrl(cleanBannerURL(defaultConfig.page.banner));
  }
  if (defaultConfig.journal.banner && !(defaultConfig.journal.banner?.includes("source.unsplash.com"))) {
    defaultConfig.journal.banner = await getBase64FromUrl(cleanBannerURL(defaultConfig.journal.banner));
  }
}

// Get RGB from any color space
const getRGBValues = (color: string) => {
  const canvas = document.createElement('canvas');
  canvas.height = 1;
  canvas.width = 1;
  const context = canvas.getContext('2d');
  context!.fillStyle = color;
  context!.fillRect(0, 0, 1, 1);
  const rgbaArray = context!.getImageData(0, 0, 1, 1).data;
  return `${rgbaArray[0]}, ${rgbaArray[1]}, ${rgbaArray[2]}`;
}

const setWidgetPrimaryColors = () => {
  const primaryTextcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-text-color').trim();
  root.style.setProperty("--widgetsTextColor", getRGBValues(primaryTextcolor));
  const primaryBgcolor = getComputedStyle(top!.document.documentElement).getPropertyValue('--ls-primary-background-color').trim();
  root.style.setProperty("--widgetsBgColor", getRGBValues(primaryBgcolor));
}

const hidePageProps = () => {
  const propBlockKeys = doc.getElementsByClassName("page-property-key");
  if (propBlockKeys?.length) {
    for (let i = 0; i < propBlockKeys.length; i++) {
      const propKey = propBlockKeys[i].textContent;
      if (propKey) {
        if (pluginPageProps.includes(propKey)) {
          propBlockKeys[i].parentElement!.parentElement!.style.display = "none";
        }
      }
    }
  }
}

const getPageType = () => {
  isPage = false;
  isHome = false;
  const pageType = body.getAttribute("data-page");
  if (pageType === "home" || pageType === "all-journals") {
    isHome = true;
    isPage = false;
  }
  if (pageType === "page") {
    isPage = true;
    isHome = false;
  }
}

const getPageAssetsData = async (currentPageData: any): Promise<AssetData> => {
  let pageAssetsData = { ...defaultConfig.journal };
  let currentPageProps: any = {};

  // home = journal page?
  if (isHome) {
    console.debug(`#${pluginId}: Homepage`);
    return pageAssetsData;
  }

  // journal page?
  isJournal = currentPageData["journal?"];
  if (isJournal) {
    console.debug(`#${pluginId}: Journal page`);
    return pageAssetsData;
  }

  // common page?
  currentPageProps = currentPageData.properties;
  if (currentPageProps) {
    console.debug(`#${pluginId}: Use page props`);
    pageAssetsData = { ...defaultConfig.page, ...currentPageProps }
  } else {
    console.debug(`#${pluginId}: Default page`);
    pageAssetsData = { ...defaultConfig.page };
  }

  // Add title
  if (currentPageData.name) {
    pageAssetsData.title = (currentPageData.name
      .split(" ")
      .slice(0,3)
      .join("-")
      .replaceAll(/[\])}[{(]/g, "")
      .replaceAll("/", "-")
    );
  }

  console.debug(`#${pluginId}: pageAssetsData -- `, pageAssetsData);

  return pageAssetsData;
}

const getPageData = async (): Promise<any> => {
  let currentPageData = null;

  currentPageData = await logseq.Editor.getCurrentPage();
  if (currentPageData) {
    // Check if page is a child and get parent ID
   //@ts-expect-error
    const currentPageId = currentPageData.page?.id;
    if (currentPageId) {
      currentPageData = null;
      currentPageData = await logseq.Editor.getPage(currentPageId);
    }
  }
  return currentPageData;
}

const cleanBannerURL = (url: string) => {
  // remove surrounding quotations if present
  url = url.replace(/^"(.*)"$/, '$1');

  // if local image from assets folder
  if (url.startsWith("../")) {
    url = encodeURI("file://" + currentGraph?.path + url.replace("..", ""));
  }

  return url;
}

const renderBanner = async (pageAssetsData: AssetData, currentPageData: any): Promise<boolean> => {
  if (pageAssetsData.banner) {
    // Set banner CSS variable
    body.classList.add("is-banner-active");
    root.style.setProperty("--bannerHeight", `${pageAssetsData.bannerHeight}`);
    root.style.setProperty("--bannerAlign", `${pageAssetsData.bannerAlign}`);

    pageAssetsData.banner = cleanBannerURL(pageAssetsData.banner);

    if (currentPageData && !currentPageData.properties["banner"] && autoPageBanner && pageAssetsData.title) {
      const defaultHeight = settingsArray.find(item => {return item.key == "pageBannerHeight"})!.default as string;
      const height = (pageAssetsData.bannerHeight || defaultHeight).replace("px", "");
      
      pageAssetsData.banner = (autoPageBannerURLPattern
        .replace("${height}", height)
        .replace("${title}", pageAssetsData.title)
      );
      console.debug(`#${pluginId}: Auto banner: ${JSON.stringify(pageAssetsData.banner)}`);
    }

    const bannerImage = await getImagebyURL(pageAssetsData.banner);
    if (bannerImage) {
      pageAssetsData.banner = bannerImage;
    } else {
      pageAssetsData.banner = defaultConfig.page.banner;
    }
    root.style.setProperty("--pageBanner", `url(${pageAssetsData.banner})`);

    return true;
  } else {
    // clear old banner
    hideBanner();
    return false;
  }
}

const getImagebyURL = async (url: string) => {
  let response = await fetch(url)
  if (response.status === 200) {
    if (response.url.includes("source-404")) {
      return "";
    }
    lastBannerURL = response.url;
    const imageBlob = await response.blob();
    return URL.createObjectURL(imageBlob);
  }
  else {
    console.info(`#${pluginId}: HTTP-Error: ${response.status}`);
    return "";
  }
}

const hideBanner = () => {
  body.classList.remove("is-banner-active");
  root.style.setProperty("--pageBanner", "");
  root.style.setProperty("--bannerHeight", "");
  root.style.setProperty("--bannerAlign", "");
}

// Page props was edited
let propsChangedObserverConfig: MutationObserverInit;
let propsChangedObserver: MutationObserver;

const propsChangedObserverInit = () => {
  propsChangedObserverConfig = {
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true,
    subtree: true
  }
  const propsChangedCallback: MutationCallback = function (mutationsList) {
    for (let i = 0; i < mutationsList.length; i++) {
      if (mutationsList[i].oldValue?.includes("pre-block")){
        console.info(`#${pluginId}: page props - deleted`);
        render();
        return;
      }
      //@ts-expect-error
      if (mutationsList[i]?.target?.offsetParent?.classList.contains("pre-block") && mutationsList[i].oldValue === "editor-wrapper"){
        console.info(`#${pluginId}: page props - edited or added`);
        render();
      }
    }
  }
  propsChangedObserver = new MutationObserver(propsChangedCallback);
}
const propsChangedObserverRun = () => {
  const preBlock = doc.getElementsByClassName("content")[0]?.firstChild?.firstChild?.firstChild?.firstChild;
  if (preBlock) {
    propsChangedObserver.observe(preBlock, propsChangedObserverConfig);
  }
}
const propsChangedObserverStop = () => {
  propsChangedObserver.disconnect();
}


const renderWidgetsPlaceholder = () => {
  if (!doc.getElementById("banner")) {
    const container = doc.getElementById("main-content-container");
    if (container) {
      container.insertAdjacentHTML(
        "afterbegin",
        `<div id="banner">
          <div id="banner-widgets">
            <div id="banner-widgets-calendar"></div>
          </div>
        </div>`
      );
    }
  }
}

const showWidgetsPlaceholder = () => {
  doc.getElementById("banner")!.style.display = "block";
}

const hideWidgetsPlaceholder = () => {
  doc.getElementById("banner")!.style.display = "none";
}

const renderWidgets = async () => {
  const isWidgetCalendarRendered = renderWidgetCalendar();
  if (isWidgetCalendarRendered) {
    doc.getElementById("banner-widgets")?.classList.add("banner-widgets-bg");
  } else {
    doc.getElementById("banner-widgets")?.classList.remove("banner-widgets-bg");
  }

  renderWidgetQuote();
}

const renderWidgetCalendar = () => {
  const bannerWidgetsCalendar = doc.getElementById("banner-widgets-calendar");
  if (widgetsConfig.calendar.enabled === "off" || (widgetsConfig.calendar.enabled === "journals" && !(isHome || isJournal))) {
    bannerWidgetsCalendar!.style.display = "none";
    return false;
  }
  bannerWidgetsCalendar!.style.display = "block";
  return true;
}

const renderWidgetQuote = async () => {
  if (widgetsConfig.quote.enabled === "off" || (widgetsConfig.quote.enabled === "journals" && !(isHome || isJournal))) {
    doc.getElementById("banner-widgets-quote")?.remove();
    return;
  }

  const quote = await getRandomQuote();
  if (!quote) {
    doc.getElementById("banner-widgets-quote")?.remove();
    return;
  }

  root.style.setProperty("--widgetsQuoteFS", getFontSize(quote.length));
  root.style.setProperty("--widgetsQuoteSize", widgetsConfig.quote.size);
  root.style.setProperty("--widgetsQuoteMaxWidth", widgetsConfig.quote.maxwidth);

  const quoteTextEl = doc.getElementById("banner-widgets-quote-text");
  if (quoteTextEl) {
    quoteTextEl.remove();
    doc.getElementById("banner-widgets-quote-block")?.insertAdjacentHTML("beforeend", `<div id="banner-widgets-quote-text">${quote}</div>`);
  } else {
    doc.getElementById("banner-widgets")?.insertAdjacentHTML("beforeend", `<div id="banner-widgets-quote"><div id="banner-widgets-quote-block"><div id="banner-widgets-quote-text">${quote}</div></div></div>`);
  }
}

const getFontSize = (textLength: number): string => {
  if(textLength > 200) {
    return "1.2em"
  }
  if(textLength > 150) {
    return "1.25em"
  }
  return "1.3em"
}

const replaceAsync = async (str: string, regex: RegExp, asyncFn: (match: any, ...args: any) => Promise<any>) => {
  const promises: Promise<any>[] = []
  str.replace(regex, (match, ...args) => {
    promises.push(asyncFn(match, args))
    return match
  })
  const data = await Promise.all(promises)
  return str.replace(regex, () => data.shift())
}

const cleanQuote = (text: string) => {
  const tag = widgetsConfig.quote.tag.replace('#', '');

  // Delete searched tag
  const regExpTag = new RegExp(`#${tag}\\b`, "gi");
  text = text.replaceAll(regExpTag, "").trim();

  // Cleanup
  for (const cleanupRegexp of widgetsQuoteCleanupRegExps) {
    text = text.replaceAll(cleanupRegexp, "").trim();
  }

  // Add Markdown bold & italic to HTML
  text = text.replaceAll(/\*\*(.*?)\*\*/g, "<b>$1</b>").replaceAll(/__(.*?)__/g, "<b>$1</b>");
  text = text.replaceAll(/\*(.*?)\*/g, "<i>$1</i>").replaceAll(/_(.*?)_/g, "<i>$1</i>");

  // Keep lines breaks
  text = text.replaceAll("\n", "<br/>");

  return text;
}

const getRandomQuote = async () => {
  const tag = widgetsConfig.quote.tag.replace('#', '');
  const query = `[
    :find ?content ?block-id
    :where
      [?b :block/refs ?r]
      [?r :block/name "${tag}"]
      (not (?b :block/marker))

      [?b :block/uuid ?block-uuid]
      [(str ?block-uuid) ?block-id]

      [?b :block/content ?content]
  ]`;
  const quotesList = await logseq.DB.datascriptQuery(query);
  if (!quotesList.length) {
    return null;
  }

  const randomQuoteBlock = quotesList[Math.floor(Math.random() * quotesList.length)];
  let quoteHTML = randomQuoteBlock[0];

  // Check is content refers to another block
  quoteHTML = await replaceAsync(quoteHTML,
    /\(\((\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\)\)/g,
    async (matched: string, [uuid]: any) => {
      const query = `[
        :find ?content
        :where
          [?b :block/uuid #uuid "${uuid}"]
          [?b :block/content ?content]
      ]`;
      const ref = await logseq.DB.datascriptQuery(query);
      if (ref.length) {
        return cleanQuote(ref[0][0]);
      }
      return matched;
    }
  );

  quoteHTML = cleanQuote(quoteHTML);
  
  const blockId = randomQuoteBlock[1];
  const pageURL = encodeURI(`logseq://graph/${currentGraph?.name}?block-id=${blockId}`);
  quoteHTML = `<a href=${pageURL} id="banner-widgets-quote-link">${quoteHTML}</a>`;
  return quoteHTML;
}

const setWidgetsCSSVars = () => {
  setTimeout(() => {
    setWidgetPrimaryColors();
  }, 500)
  root.style.setProperty("--widgetsCalendarWidth", widgetsConfig.calendar.width);
}

const render = async () => {
  getPageType();

  if (!(isHome || isPage)) {
    hideBanner();
    return;
  }

  hidePageProps();

  const currentPageData = await getPageData();

  let pageAssetsData: AssetData | null = null;
  pageAssetsData = await getPageAssetsData(currentPageData);
  if (pageAssetsData) {
    if (!pageAssetsData.banner || pageAssetsData.banner === "false" || pageAssetsData.banner === "off" || pageAssetsData.banner === "none" || pageAssetsData.banner === '""'  || pageAssetsData.banner === "''") {
      hideBanner();
      return;
    }

    const isBannerRendered = await renderBanner(pageAssetsData, currentPageData);
    if (isBannerRendered) {
      renderWidgets();
      showWidgetsPlaceholder();
    }
  }
}

const commandSaveBanner = async () => {
  const currentPage = await getPageData();

  const currentBanner = lastBannerURL;
  const pageBanner = currentPage.properties["banner"];
  if (pageBanner && pageBanner !== currentBanner) {
    logseq.UI.showMsg(
      'There is the "banner" propery in this page with a different value. Remove it manually and run this command again.',
      "warning",
      {timeout: 10000},
    );
    return;
  }

  const pageBannerAlign = currentPage.properties["banner-align"];
  const currentBannerAlign = pageBannerAlign || getComputedStyle(root).getPropertyValue("--bannerAlign");

  const [ propertiesBlock ] = await logseq.Editor.getPageBlocksTree(currentPage.name);
  await logseq.Editor.upsertBlockProperty(propertiesBlock.uuid, "banner", currentBanner);
  await logseq.Editor.upsertBlockProperty(propertiesBlock.uuid, "banner-align", currentBannerAlign);

  logseq.UI.showMsg("Current banner saved to page properties");
}

const main = async () => {
  console.info(`#${pluginId}: Loaded`);

  currentGraph = (await logseq.App.getCurrentGraph());

  logseq.useSettingsSchema(settingsArray);
  doc = top!.document;
  root = doc.documentElement;
  body = doc.body;

  logseq.provideStyle(mainStyles);

  renderWidgetsPlaceholder();
  hideWidgetsPlaceholder();

  setTimeout(() => {
    readPluginSettings();
    setWidgetsCSSVars();
    render();
  }, 500)

  // Listeners late run
  propsChangedObserverInit();

  logseq.App.registerCommandPalette({
      key: "banners-save-for-page",
      label: "Banners → Save banner for this page",
  }, async (e) => {
    commandSaveBanner();
  });

  // Secondary listeners
  setTimeout(() => {
    // Listen for page props
    propsChangedObserverRun();


    logseq.App.onRouteChanged( async () => {
      console.debug(`#${pluginId}: page route changed`);

      // Content reloaded, so need reconnect props listeners
      propsChangedObserverStop();

      // Rerender banner
      render();

      setTimeout(() => {
        propsChangedObserverRun();
      }, 200)
    })


    logseq.onSettingsChanged(() => {
      readPluginSettings();
      setWidgetsCSSVars();
      render();
    })


    logseq.App.onThemeModeChanged( () => {
      setTimeout(() => {
        setWidgetPrimaryColors();
      }, 300)
    })


    logseq.App.onCurrentGraphChanged( async () => {
      currentGraph = (await logseq.App.getCurrentGraph());
    })


    // Listen plugin unload
    logseq.beforeunload( async () => {
      top!.document.getElementById("banner")?.remove();
      body.classList.remove("is-banner-active");
      body.classList.remove("is-icon-active");
    })

  }, 2000);
}

logseq.ready(main).catch(console.error);

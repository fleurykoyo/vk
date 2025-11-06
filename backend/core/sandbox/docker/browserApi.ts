import express from 'express';
import { Stagehand, type LogLine, type Page } from '@browserbasehq/stagehand';
import { FileChooser } from 'playwright';

const app = express();
app.use(express.json());

interface BrowserActionResult {
    success: boolean;
    message: string;
    error?: string;
    url: string;
    title: string;
    screenshot_base64?: string;
    action?: string;
}

class BrowserAutomation {
    public router: express.Router;

    private stagehand: Stagehand | null;
    public browserInitialized: boolean;
    private page: Page | null;
    constructor() {
        this.router = express.Router();
        this.browserInitialized = false;
        this.stagehand = null;
        this.page = null;

        this.router.post('/navigate', this.navigate.bind(this));
        this.router.post('/screenshot', this.screenshot.bind(this));
        this.router.post('/act', this.act.bind(this));
        this.router.post('/extract', this.extract.bind(this));
        this.router.post('/convert-svg', this.convertSvg.bind(this));

    }

    async init(apiKey: string): Promise<{status: string, message: string}> {
        try{
            if (!this.browserInitialized) {
                // Clean up any existing browser before initializing new one
                if (this.stagehand && this.page) {
                    console.log("Cleaning up existing browser before init");
                    await this.shutdown();
                }
                
                console.log("Initializing browser with api key");
                this.stagehand = new Stagehand({
                    env: "LOCAL",
                    enableCaching: true,
                    verbose: 2,
                    logger: (logLine: LogLine) => {
                        console.log(`[${logLine.category}] ${logLine.message}`);
                    },
                    modelName: "google/gemini-2.5-pro",
                    modelClientOptions: {
                        apiKey
                    },
                    localBrowserLaunchOptions: {
                        headless: false,
                        viewport: {
                            width: 1024,
                            height: 768
                        },
                        downloadsPath: '/workspace/downloads',
                        acceptDownloads: true,
                        preserveUserDataDir: false,
                        args: [
                            "--no-sandbox",
                            "--disable-setuid-sandbox",
                            "--disable-dev-shm-usage",
                            "--disable-gpu",
                            "--ignore-certificate-errors",
                            "--ignore-ssl-errors",
                            "--ignore-certificate-errors-spki-list",
                            "--disable-web-security",
                            "--allow-running-insecure-content",
                            "--disable-features=IsolateOrigins,site-per-process",
                            "--disable-site-isolation-trials",
                            "--disable-blink-features=AutomationControlled",
                            "--no-first-run",
                            "--no-default-browser-check",
                            "--disable-default-apps",
                            "--disable-popup-blocking",
                            "--disable-translate",
                            "--disable-background-networking",
                            "--disable-sync",
                            "--metrics-recording-only",
                            "--mute-audio",
                            "--no-pings",
                            "--disable-background-timer-throttling",
                            "--disable-renderer-backgrounding",
                            "--disable-backgrounding-occluded-windows",
                            "--disable-ipc-flooding-protection"
                        ]
                    }
                });
                await this.stagehand.init();
                this.browserInitialized = true;
                this.page = this.stagehand.page;

                // Attach listeners to detect browser or page crashes and reset state accordingly
                if (this.page) {
                    // If the browser page itself closes we mark the automation as un-initialised
                    this.page.on('close', () => {
                        console.log('Browser page closed - resetting state');
                        this.browserInitialized = false;
                    });

                    // If the underlying browser disconnects (e.g. crashes) we also reset state
                    try {
                        const browserInstance = this.page.context().browser();
                        browserInstance?.on('disconnected', () => {
                            console.log('Browser disconnected - resetting state');
                            this.browserInitialized = false;
                        });
                    } catch (err) {
                        console.error('Failed to attach browser disconnect handler', err);
                    }
                }

                // Test internet connectivity with a simple navigation
                // Try HTTP first (more likely to work if HTTPS is blocked)
                try {
                    await this.page.goto('http://www.google.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
                } catch (initError: any) {
                    const errorMessage = initError?.message || String(initError);
                    console.error("Browser initialization navigation to HTTP failed, trying HTTPS:", errorMessage);
                    
                    // If HTTP fails, try HTTPS
                    try {
                        await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
                    } catch (httpsError: any) {
                        const httpsErrorMessage = httpsError?.message || String(httpsError);
                        console.error("Browser initialization navigation to HTTPS also failed:", httpsErrorMessage);
                        
                        // If both fail, provide helpful message but still mark as initialized
                        // The browser is initialized even if network is not available
                        if (httpsErrorMessage.includes('net::ERR_NAME_NOT_RESOLVED') || 
                            httpsErrorMessage.includes('DNS_PROBE_FINISHED_NXDOMAIN') ||
                            httpsErrorMessage.includes('net::ERR_INTERNET_DISCONNECTED') ||
                            httpsErrorMessage.includes('timeout') ||
                            httpsErrorMessage.includes('ERR_CONNECTION_RESET') ||
                            httpsErrorMessage.includes('ERR_CONNECTION_REFUSED')) {
                            console.warn("Browser initialized but internet connectivity test failed. The sandbox may have network restrictions.");
                            return {
                                status: "healthy",
                                message: "Browser initialized (but internet connectivity test failed - check sandbox network configuration and firewall/proxy settings)"
                            }
                        } else {
                            // For other errors, still initialize but log the warning
                            console.warn("Browser initialization navigation failed but continuing:", httpsErrorMessage);
                        }
                    }
                }
                
                return {
                    status: "healthy",
                    message: "Browser initialized"
                }
            }
            return {
                status: "healthy",
                message: "Browser already initialized"
            }
        } catch (error) {
            console.error("Error initializing browser", error);
            return {
                status: "error",
                message: String(error) || "Failed to initialize browser"
            }
        }
    }

    health(): {status: string} {
        if (this.browserInitialized && this.page && !this.page.isClosed()) {
            return {
                status: "healthy"
            }
        }
        return {
            status: "unhealthy"
        }
    }

    async shutdown() {
        console.log("Shutting down browser");
        this.browserInitialized = false;
        if (this.stagehand && this.page) {
            try {
                await this.stagehand.close();
            } catch (error) {
                console.error("Error closing stagehand:", error);
            }
        }
        this.stagehand = null;
        this.page = null;
        return {
            status: "shutdown",
            message: "Browser shutdown"
        }
    }

    async get_stagehand_state() {
        try{
            const health = this.health();
            if (this.page && health.status === "healthy") {
                const screenshot_base64 = await this.page.screenshot({ fullPage: false }).then(buffer => buffer.toString('base64'));
                const page_info = {
                    url: await this.page.url(),
                    title: await this.page.title(),
                    screenshot_base64: screenshot_base64,
                };
                return page_info;
            }
            return {
                url: "",
                title: "",
                screenshot_base64: "",
            }
        } catch (error) {
            console.error("Error capturing stagehand state", error);
            return {
                url: "",
                title: "",
                screenshot_base64: "",
            }
        }
    }

    async navigate(req: express.Request, res: express.Response): Promise<void> {
        try {
            if (this.page && this.browserInitialized) {
                const { url } = req.body;
                
                // Check network connectivity first
                try {
                    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                } catch (navigationError: any) {
                    const errorMessage = navigationError?.message || String(navigationError);
                    
                    // Provide helpful error messages for common network issues
                    if (errorMessage.includes('net::ERR_NAME_NOT_RESOLVED') || 
                        errorMessage.includes('DNS_PROBE_FINISHED_NXDOMAIN') ||
                        errorMessage.includes('net::ERR_INTERNET_DISCONNECTED')) {
                        throw new Error(`Network connectivity issue: The sandbox cannot access the internet. Please check if the sandbox has internet access configured. Error: ${errorMessage}`);
                    } else if (errorMessage.includes('timeout') || errorMessage.includes('Navigation timeout')) {
                        throw new Error(`Navigation timeout: The website took too long to load. This could indicate a network issue or the website is down. Error: ${errorMessage}`);
                    } else if (errorMessage.includes('net::ERR_CONNECTION_REFUSED')) {
                        throw new Error(`Connection refused: The website refused the connection. This could be a firewall or network configuration issue. Error: ${errorMessage}`);
                    } else if (errorMessage.includes('ERR_CONNECTION_RESET') || 
                               errorMessage.includes('net::ERR_CONNECTION_RESET')) {
                        throw new Error(`Connection reset: The connection was reset by the server or a proxy. This often indicates that a network proxy (like Envoy/Istio) is blocking external internet access. Please check your Daytona network security settings to allow internet access. Error: ${errorMessage}`);
                    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                        throw new Error(`Access forbidden: The request was blocked by a network proxy (likely Envoy). Your Daytona sandbox appears to have network restrictions that block external internet access. Please contact your administrator to configure network security rules to allow internet access. Error: ${errorMessage}`);
                    } else {
                        throw navigationError;
                    }
                }
                
                const page_info = await this.get_stagehand_state();
                const result: BrowserActionResult = {
                    success: true,
                    message: "Navigated to " + url,
                    error: "",
                    url: page_info.url,
                    title: page_info.title,
                    screenshot_base64: page_info?.screenshot_base64,
                }
                res.json(result);
            } else {
                res.status(500).json({
                    success: false,
                    message: "Browser not initialized",
                    error: "Browser must be initialized before navigation",
                    url: "",
                    title: ""
                } as BrowserActionResult)
            }
        } catch (error: any) {
            console.error("Navigation error:", error);
            const page_info = await this.get_stagehand_state();
            const errorMessage = error?.message || String(error);
            res.status(500).json({
                success: false,
                message: "Failed to navigate to " + (req.body?.url || 'unknown URL'),
                url: page_info.url,
                title: page_info.title,
                screenshot_base64: page_info.screenshot_base64,
                error: errorMessage
            })
        }
    }

    async screenshot(req: express.Request, res: express.Response): Promise<void> {
        try {
            if (this.page && this.browserInitialized) {
                const page_info = await this.get_stagehand_state();
                const result: BrowserActionResult = {
                    success: true,
                    message: "Screenshot taken",
                    url: page_info.url,
                    title: page_info.title,
                    screenshot_base64: page_info.screenshot_base64,
                }
                res.json(result);
            } else {
                res.status(500).json({
                    success: false,
                    message: "Browser not initialized",
                    error: "Browser must be initialized before taking screenshot",
                    url: "",
                    title: ""
                } as BrowserActionResult)
            }
        } catch (error) {
            console.error(error);
            const page_info = await this.get_stagehand_state();
            res.status(500).json({
                success: false,
                message: "Failed to take screenshot",
                url: page_info.url,
                title: page_info.title,
                screenshot_base64: page_info.screenshot_base64,
                error
            })
        }
    }

    async act(req: express.Request, res: express.Response): Promise<void> {
        let fileChooseHandler: ((fileChooser: FileChooser) => Promise<void>) | null = null;
        try {
            if (this.page && this.browserInitialized) {
                const { action, iframes, variables, filePath } = req.body;

                const fileChooseHandler = async (fileChooser: FileChooser) => {
                    if(filePath){
                        await fileChooser.setFiles(filePath);
                    } else {
                        await fileChooser.setFiles([]);
                    }
                };

                this.page.on('filechooser', fileChooseHandler);

                const result = await this.page.act({action, iframes: iframes || true, variables});
                const page_info = await this.get_stagehand_state();
                const response: BrowserActionResult = {
                    success: result.success,
                    message: result.message,
                    action: result.action,
                    url: page_info.url,
                    title: page_info.title,
                    screenshot_base64: page_info.screenshot_base64,
                }
                res.json(response);
            } else {
                res.status(500).json({
                    success: false,
                    message: "Browser not initialized",
                    error: "Browser must be initialized before performing actions",
                    url: "",
                    title: ""
                } as BrowserActionResult)
            }
        } catch (error) {
            console.error(error);
            const page_info = await this.get_stagehand_state();
            res.status(500).json({
                success: false,
                message: "Failed to act",
                url: page_info.url,
                title: page_info.title,
                screenshot_base64: page_info.screenshot_base64,
                error
            })
        } finally {
            if (this.page && fileChooseHandler) {
                this.page.off('filechooser', fileChooseHandler);
            }
        }

    }

    async extract(req: express.Request, res: express.Response): Promise<void> {
        try {
            if (this.page && this.browserInitialized) {
                const { instruction, iframes } = req.body;
                const result = await this.page.extract({ instruction, iframes });
                const page_info = await this.get_stagehand_state();
                const response: BrowserActionResult = {
                    success: result.success,
                    message: `Extracted result for: ${instruction}`,
                    action: result.extraction,
                    url: page_info.url,
                    title: page_info.title,
                    screenshot_base64: page_info.screenshot_base64,
                }
                res.json(response);
            } else {
                res.status(500).json({
                    success: false,
                    message: "Browser not initialized",
                    error: "Browser must be initialized before extracting data",
                    url: "",
                    title: ""
                } as BrowserActionResult)
            }
        } catch (error) {
            console.error(error);
            const page_info = await this.get_stagehand_state();
            res.status(500).json({
                success: false,
                message: "Failed to extract",
                url: page_info.url,
                title: page_info.title,
                screenshot_base64: page_info.screenshot_base64,
                error
            })
        }
    }

    async convertSvg(req: express.Request, res: express.Response) {
        console.log(`Converting SVG to PNG: ${JSON.stringify(req.body)}`);
        
        try {
            if (!this.browserInitialized || !this.page) {
                res.status(500).json({
                    success: false,
                    message: "Browser not initialized",
                    error: "Browser must be initialized before converting SVG",
                    url: "",
                    title: ""
                } as BrowserActionResult);
                return;
            }

            const { svg_file_path } = req.body;
            
            if (!svg_file_path) {
                res.status(400).json({
                    success: false,
                    message: "SVG file path is required",
                    error: "svg_file_path parameter is missing",
                    url: "",
                    title: ""
                } as BrowserActionResult);
                return;
            }

            // Navigate to the SVG file
            const fileUrl = `file://${svg_file_path}`;
            await this.page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            // Wait for any potential loading/animations
            await this.page.waitForTimeout(500);

            let screenshot_base64: string;
            
            // Try to get the SVG element and take a screenshot of just that element
            const svgElement = await this.page.locator('svg').first();
            const svgCount = await this.page.locator('svg').count();
            
            if (svgCount > 0) {
                // Get bounding box to check if element is visible
                const bbox = await svgElement.boundingBox();
                
                if (bbox && bbox.width > 0 && bbox.height > 0) {
                    // Take screenshot of just the SVG element
                    const screenshotBuffer = await svgElement.screenshot({ type: 'png' });
                    screenshot_base64 = screenshotBuffer.toString('base64');
                } else {
                    // Fallback to full page screenshot
                    const screenshotBuffer = await this.page.screenshot({ fullPage: true, type: 'png' });
                    screenshot_base64 = screenshotBuffer.toString('base64');
                }
            } else {
                // No SVG found, take full page screenshot anyway
                const screenshotBuffer = await this.page.screenshot({ fullPage: true, type: 'png' });
                screenshot_base64 = screenshotBuffer.toString('base64');
            }

            const page_info = await this.get_stagehand_state();
            
            res.json({
                success: true,
                message: `Successfully converted SVG to PNG: ${svg_file_path}`,
                url: page_info.url,
                title: page_info.title,
                screenshot_base64: screenshot_base64
            } as BrowserActionResult);

        } catch (error) {
            console.error("Error converting SVG:", error);
            const page_info = await this.get_stagehand_state();
            
            res.status(500).json({
                success: false,
                message: "Failed to convert SVG",
                url: page_info.url,
                title: page_info.title,
                screenshot_base64: page_info.screenshot_base64,
                error: String(error)
            } as BrowserActionResult);
        }
    }

}

const browserAutomation = new BrowserAutomation();

app.use('/api', browserAutomation.router);

app.get('/api', (req, res) => {
    console.log("Health check");
    const health = browserAutomation.health();
    if (health.status === "healthy") {
        res.status(200).json({
            "status": "healthy",
            "service": "browserApi"
        })
    } else {
        res.status(500).json({
            "status": "unhealthy",
            "service": "browserApi"
        })
    }
});

app.post('/api/init', async (req, res) => {
    console.log("Initializing browser");
    const {api_key} = req.body;
    const result = await browserAutomation.init(api_key);
    
    if (result.status === "initialized" || result.status === "healthy") {
        res.status(200).json({
            "status": "healthy",
            "service": "browserApi"
        })
    } else {
        res.status(500).json({
            "status": "error",
            "message": result.message
        })
    }
});

app.listen(8004, () => {
    console.log('Starting browser server on port 8004');
});
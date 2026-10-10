# Talladega custom domain

The reunion site is published at https://talladega-family-reunion.p5v5vhhkmv.chatgpt.site.

For the Cloudflare zone **murphsmitts.com**, add the following records. Names below are relative to that zone. Keep the CNAME **DNS only** while validating the hostname. TTL can remain Auto.

| Type | Name | Content |
| --- | --- | --- |
| CNAME | talladega | custom-domains.chatgpt.site |
| TXT | _openai-site-verification.talladega | openai-site-verification=AO7TXrEq6UQMC4Fp7T-qEGajpx_AXLKut5_GJmpAPaE |
| TXT | _cf-custom-hostname.talladega | a5796f83-7bd3-4629-84f0-f8b1ba0bb516 |

All three records were added and verified in Cloudflare on October 10, 2026. DNS uses Auto TTL and the CNAME is DNS only. Hosting validation is complete: the TLS certificate for talladega.murphsmitts.com was issued October 10, 2026 (expires January 8, 2027) and the domain serves the site.

Desired URL: https://talladega.murphsmitts.com

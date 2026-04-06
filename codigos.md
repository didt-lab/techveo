▲ Next.js 16.2.1 (webpack)
- Local:         http://localhost:3000
- Network:       http://172.29.144.1:3000
- Environments: .env.local
✓ Ready in 463ms
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
- Experiments (use with caution):
  · optimizePackageImports

<w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (215kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
○ Compiling / ...
 GET / 200 in 11.4s (next.js: 8.9s, application-code: 2.6s)
[browser] Uncaught Error: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch

  ...
    <ErrorBoundary errorComponent={undefined} errorStyles={undefined} errorScripts={undefined}>
      <LoadingBoundary name="/" loading={null}>
        <HTTPAccessFallbackBoundary notFound={{...}} forbidden={undefined} unauthorized={undefined}>
          <HTTPAccessFallbackErrorBoundary pathname="/" notFound={{...}} forbidden={undefined} unauthorized={undefined} ...>
            <RedirectBoundary>
              <RedirectErrorBoundary router={{...}}>
                <InnerLayoutRouter url="/" tree={[...]} params={{}} cacheNode={{rsc:{...}, ...}} segmentPath={[...]} ...>
                  <SegmentViewNode type="page" pagePath="page.tsx">
                    <SegmentTrieNode>
                    <ClientPageRoot Component={function DisplayPage} serverProvidedParams={{...}}>
                      <DisplayPage params={Promise} searchParams={Promise}>
                        <main className="h-screen f...">
                          <header>
                          <div className="flex-1 rel...">
                            <Carousel cumpleanos={[...]} aniversarios={[...]}>
                              <div
+                               className="relative w-full h-full"
-                               className="flex flex-col items-center justify-center h-full text-white/40"
-                               style={{opacity:"0"}}
                              >
                                ...
                                  <Slide type="birthday" events={[...]}>
                                    <motion.div initial={{opacity:0,x:80}} animate={{opacity:1,x:0}} ...>
+                                     <div
+                                       className="absolute inset-0 flex flex-col items-center justify-center px-16"
+                                       style={{opacity:0,transform:"translateX..."}}
+                                       ref={function useMotionRef.useCallback}
+                                     >
-                                     <span className="text-9xl mb-8">
                          ...
                  ...
                ...

    at <unknown> (https://react.dev/link/hydration-mismatch)
    at div (<anonymous>)
    at Slide (components\display\Slide.tsx:22:5)
    at Carousel (components\display\Carousel.tsx:68:11)
    at DisplayPage (app\page.tsx:96:11)
  20 | export function Slide(props: Props) {
  21 |   return (
> 22 |     <motion.div
     |     ^
  23 |       initial={{ opacity: 0, x: 80 }}
  24 |       animate={{ opacity: 1, x: 0 }}
  25 |       exit={{ opacity: 0, x: -80 }}
○ Compiling /admin/importar/cumpleanos ...
 GET / 200 in 136ms (next.js: 38ms, application-code: 98ms)
 GET /admin/importar/cumpleanos 200 in 11.7s (next.js: 7.0s, proxy.ts: 3.7s, application-code: 1026ms)
 GET /api/events 200 in 7.4s (next.js: 5.8s, application-code: 1557ms)
 GET / 200 in 257ms (next.js: 3ms, application-code: 254ms)
 GET /api/events 200 in 504ms (next.js: 2ms, application-code: 502ms)
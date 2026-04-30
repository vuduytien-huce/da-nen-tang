/// <reference types="@cloudflare/workers-types" />
export interface Env {
  AUDIO_BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response("Object key is required in path", { status: 400 });
    }

    // Handle PUT request to upload file
    if (request.method === "PUT") {
      try {
        await env.AUDIO_BUCKET.put(key, request.body);
        return new Response(`Successfully uploaded ${key} to R2!`, { status: 201 });
      } catch (e: any) {
        return new Response(`Upload failed: ${e.message}`, { status: 500 });
      }
    }

    // Handle GET request to download file
    if (request.method === "GET") {
      const object = await env.AUDIO_BUCKET.get(key);
      if (object === null) {
        return new Response("Object Not Found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);

      return new Response(object.body, { headers });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};


export async function onRequest({ params }) {
  const uid = String(params.uid || "");

  if (!/^\d{8,10}$/.test(uid)) {
    return Response.json(
      { error: "Invalid Genshin UID." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://enka.network/api/uid/${uid}/?info`,
      {
        headers: {
          Accept: "application/json"
        }
      }
    );

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ||
          "application/json",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch {
    return Response.json(
      { error: "Unable to contact Enka.Network." },
      { status: 502 }
    );
  }
}

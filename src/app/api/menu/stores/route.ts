import { listDirectoryStores } from "@/lib/stores/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const typeId = searchParams.get("typeId") ?? searchParams.get("category") ?? "all";
    const subCategoryId =
      searchParams.get("subCategoryId") ?? searchParams.get("subCategory") ?? "";

    const stores = await listDirectoryStores({
      typeId,
      subCategoryId: subCategoryId || null,
    });

    return Response.json(
      {
        ok: true,
        typeId,
        subCategoryId: subCategoryId || null,
        stores,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    console.error("[menu/stores]", error);
    return Response.json({ ok: false, stores: [] }, { status: 500 });
  }
}

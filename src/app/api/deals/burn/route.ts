import { getBurnDealsFeed } from "@/lib/stores/burn-deals-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const categoryType =
      searchParams.get("categoryType") ??
      searchParams.get("category") ??
      searchParams.get("typeId") ??
      "ALL";
    const subCategoryId =
      searchParams.get("subCategoryId") ?? searchParams.get("subCategory") ?? null;

    const feed = await getBurnDealsFeed(categoryType, subCategoryId);

    return Response.json(
      {
        ok: true,
        categoryType: categoryType.trim() || "ALL",
        subCategoryId: subCategoryId?.trim() || null,
        ...feed,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("[deals/burn]", error);
    return Response.json({ ok: false, stores: [] }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getArticles, createArticle, CreateArticleInput } from "@/lib/articles";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const category = searchParams.get("category") || undefined;

    const data = getArticles({ page, limit, category });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateArticleInput;

    if (!body.title || !body.slug || !body.content || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 필드가 누락되었습니다: title, slug, content, category는 필수입니다.",
        },
        { status: 400 }
      );
    }

    const newArticle = createArticle(body);
    return NextResponse.json({ success: true, article: newArticle }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/articles error:", error);

    const err = error as { code?: string; message?: string };
    // UNIQUE 제약조건 위반 (동일 slug)
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 slug입니다. 다른 slug를 사용해주세요." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

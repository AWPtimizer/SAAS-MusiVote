import { prismaClient } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";

var YT_REGEX =
  /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const data = CreateStreamSchema.parse(await req.json());
    const isYT = data.url.match(YT_REGEX);

    if (!isYT) {
      return NextResponse.json(
        {
          message: "Wrong URL format",
        },
        {
          status: 411,
        }
      );
    }

    const extractedID = data.url.split("?v=")[1];

    const res = await youtubesearchapi.GetVideoDetails(extractedID);
    const thumbnails = res.thumbnail.thumbnails;

    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const stream = await prismaClient.stream.create({
      data: {
        userId: data.creatorId,
        url: data.url,
        extractedID,
        type: "Youtube",
        title: res.title ?? "Can't Find Video",
        smallImg:
          (thumbnails.length > 1
            ? thumbnails[thumbnails.length - 2].url
            : thumbnails[thumbnails.length - 1].url) ??
          "https://wallpapercat.com/w/full/7/2/1/24250-3840x2160-desktop-4k-cat-background.jpg",
        bigImg:
          thumbnails[thumbnails.length - 1].url ??
          "https://wallpapercat.com/w/full/7/2/1/24250-3840x2160-desktop-4k-cat-background.jpg",
      },
    });

    return NextResponse.json({
      message: "Added Stream",
      id: stream.id,
    });
  } catch (e) {
    console.log(e);
    
    return NextResponse.json(
      {
        message: "Error while adding a stream",
      },
      {
        status: 411,
      }
    );
  }
}

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const streams = await prismaClient.stream.findMany({
    where: {
      userId: creatorId ?? "",
    },
  });

  return NextResponse.json({
    streams,
  });
}

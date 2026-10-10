import type { Response } from "express";
import { config } from "../../config";

interface ICookieData {
  type: "login" | "logout";
  res: Response;
  accessToken?: string;
  refreshToken?: string;
}

export default function handleCookies({ type, res, accessToken, refreshToken }: ICookieData) {
  const isProduction = config.env === "production";
  const cookieOptions = {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    partitioned: isProduction,
    path: "/",
  };

  if (type === "login") {
    res.cookie("accessToken", accessToken!, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken!, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } else {
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
  }
}

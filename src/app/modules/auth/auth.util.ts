import type { Response } from "express";
import { config } from "../../config";

interface ICookieData {
  type: "login" | "logout";
  res: Response;
  accessToken?: string;
  refreshToken?: string;
}

export default function handleCookies({ type, res, accessToken, refreshToken }: ICookieData) {
  const cookieOptions = {
    secure: config.env === "production",
    httpOnly: true,
    sameSite: config.env === "production" ? ("lax" as const) : ("lax" as const),
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

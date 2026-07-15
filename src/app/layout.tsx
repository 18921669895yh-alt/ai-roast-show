import type { Metadata } from "next";
import type { ReactNode } from "react";

import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import SpotlightBackground from "../components/stage/SpotlightBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI吐槽大会｜今晚谁来挨说",
    template: "%s｜AI吐槽大会",
  },
  description: "上传照片或贴上文案，让 AI 用有观察、有分寸的脱口秀方式说你两句。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">跳到主要内容</a>
        <SpotlightBackground />
        <div className="site-shell toxic-version">
          <div className="toxic-version-banner" role="note">
            <span>TOXIC REVIEW MODE</span>
            <strong>不哄、不绕，直接指出问题</strong>
            <small>仅限虚构喜剧锐评，不攻击真实身份特征</small>
          </div>
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}

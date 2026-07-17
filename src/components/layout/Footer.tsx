"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import SafetyNotice from "./SafetyNotice";
import { focusHashTarget } from "./hashNavigation";

export default function Footer() {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const openNotice = useCallback(() => setNoticeOpen(true), []);
  const closeNotice = useCallback(() => setNoticeOpen(false), []);
  return (
    <>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Link className="footer-logo" href="/">AI吐槽大会</Link>
            <p>只锐评提交的内容，不评价任何人的现实身份。</p>
          </div>
          <nav className="footer-navigation" aria-label="页脚导航">
            <button type="button" onClick={openNotice}>内容原则</button>
            <Link href="/#privacy" onClick={(event) => focusHashTarget(event, "/#privacy")}>隐私说明</Link>
            <a href="mailto:feedback@airoast.local">意见反馈</a>
            <Link href="/#about" onClick={(event) => focusHashTarget(event, "/#about")}>关于锐评</Link>
          </nav>
        </div>
      </footer>
      <SafetyNotice open={noticeOpen} onClose={closeNotice} />
    </>
  );
}

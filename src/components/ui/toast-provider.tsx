"use client";

import { ToastContainer, Slide } from "react-toastify";
import { FlashToastListener } from "@/components/ui/flash-toast-listener";

/**
 * Conteneur react-toastify (v11 injecte le CSS runtime).
 * Charte MSK via classes + variables — voir `globals.css` (`.Toastify`).
 *
 * @see https://fkhadra.github.io/react-toastify/introduction
 */
export function ToastProvider() {
  return (
    <>
      <FlashToastListener />
      <ToastContainer
        position="top-right"
        autoClose={4200}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Slide}
        limit={3}
        stacked
        toastClassName="msk-toast"
        progressClassName="msk-toast-progress"
      />
    </>
  );
}

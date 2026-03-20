import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  overlayClass = "",
  modalClass = "",
  closeButton = true,
  footer = null,
  disableEscapeClose = false,
  closeOnOverlayClick = true,
  centered = false,
  type = "default",
}) => {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    xxl: "max-w-4xl",
  };

  const isLeadsType = type === "leads";

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose();
  };

  return (
    <div className="font-dm-sans">
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={disableEscapeClose ? () => {} : onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className={`fixed inset-0 bg-gray-900/60 ${overlayClass}`} onClick={handleOverlayClick} />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div
              className={`flex min-h-full justify-center px-4 py-6 ${
                centered ? "items-center" : "items-start pt-[60px]"
              }`}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={`relative w-full overflow-hidden bg-white shadow-xl ${sizeClasses[size]} ${
                    isLeadsType ? "rounded-[28px]" : "rounded-lg"
                  } ${modalClass}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isLeadsType && closeButton && (
                    <button
                      onClick={onClose}
                      className="absolute right-3 top-3 z-10 text-gray-800 hover:text-gray-700 focus:outline-none"
                    >
                      <span className="sr-only">Close</span>✕
                    </button>
                  )}

                  {!isLeadsType && title ? (
                    <Dialog.Title className="border-b border-gray-300 px-6 py-4 font-dm-sans text-lg font-medium text-gray-900">
                      {title}
                    </Dialog.Title>
                  ) : null}

                  <div
                    className={
                      isLeadsType ? "px-6 py-6 font-dm-sans text-gray-800" : "px-6 py-4 font-dm-sans text-gray-800"
                    }
                  >
                    {children}
                  </div>

                  {!isLeadsType && footer ? (
                    <div className="border-t border-gray-300 px-6 py-4 font-dm-sans text-gray-800">{footer}</div>
                  ) : null}

                  {isLeadsType && footer ? <div className="px-6 pb-6 font-dm-sans text-gray-800">{footer}</div> : null}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Modal;

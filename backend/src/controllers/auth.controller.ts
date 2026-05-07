import { Request, Response, NextFunction } from "express";
import { SiweMessage } from "siwe";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "../middleware/error.middleware";

const nonceStore = new Map<string, string>();

export const getNonce = (req: Request, res: Response): void => {
  const rawAddress = req.params.address;
  const address = Array.isArray(rawAddress) ? rawAddress[0] : rawAddress;

  if (!address) {
    res.status(400).json({ success: false, message: "Address required" });
    return;
  }

  const nonce = Math.random().toString(36).substring(2, 15);
  nonceStore.set(address.toLowerCase(), nonce);

  res.json({ success: true, nonce });
};

export const verifySignature = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message, signature } = req.body;

    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return next(new AppError("Invalid signature", 401));
    }

    const address = result.data.address.toLowerCase();
    const storedNonce = nonceStore.get(address);

    if (!storedNonce || storedNonce !== result.data.nonce) {
      return next(new AppError("Invalid or expired nonce", 401));
    }

    nonceStore.delete(address);

    const token = jwt.sign({ address }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
    });

    res.json({ success: true, token, address });
  } catch (err) {
    next(err);
  }
};
